import React, { useMemo, useState } from 'react'
import { YStack, XStack, Text, Spinner } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import BackHeader from '../components/BackHeader'
import Button from '../components/ui/Button'
import AmountInputCard from '../components/AmountInputCard'
import Screen from '../components/ui/Screen'
import Footer from '../components/ui/Footer'
import { RootStackParamList } from '../types/types'
import { ethers } from 'ethers'
import * as WebBrowser from 'expo-web-browser'
import { erc20Abi, getReadonlyProvider } from '../providers/eth-rpc'
import { explorerTxUrl } from '../providers/eth-rpc'
import { useAppStore } from '../store/appStore'
import TxProgressCard from '../components/TxProgressCard'
import { SupportedNetworkKey } from '../lib/utils'

type SendTokenParams = {
  address: string
  to: string
  token: {
    symbol: string
    name: string
    balance: string
    icon?: string
    network?: SupportedNetworkKey
    address?: string
    isNative?: boolean
    decimals?: number
  }
}

export default function SendAmountScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { address, to, token } = (route.params as SendTokenParams) || ({} as SendTokenParams)
  const [amount, setAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [stage, setStage] = useState<'idle' | 'preparing' | 'broadcasting' | 'confirming' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ethers.TransactionReceipt | null>(null)
  const [confirmedAt, setConfirmedAt] = useState<number | null>(null) // ms epoch
  const [feeNative, setFeeNative] = useState<string | null>(null)
  const ephemeralWallet = useAppStore((s) => s.ephemeralWallet)

  const balanceNum = useMemo(() => Number(token?.balance ?? 0), [token])
  const amountNum = useMemo(() => Number(amount || '0'), [amount])

  const empty = amount.trim() === ''
  const tooBig = amountNum > balanceNum
  const notPositive = !(amountNum > 0)
  const invalid = (!empty && (Number.isNaN(amountNum) || notPositive)) || tooBig

  const canSend = !empty && !invalid && !isSending

  async function handleSend() {
    if (!token?.network) return
    setErrorMsg('')
    setIsSending(true)
    setStage('preparing')
    try {
      const network = token.network
      const decimals = token.isNative ? 18 : token.decimals ?? 18
      let amountRaw: bigint
      try {
        amountRaw = ethers.parseUnits(amount.trim(), decimals)
      } catch (e: any) {
        throw new Error('Invalid amount format')
      }
      // Use ephemeral in-memory signer set at import time
      if (!ephemeralWallet) throw new Error('No signer available. Please re-import your wallet.')
      const wallet = ephemeralWallet
      // Verify signer matches the sending address
      const fromChecksum = (() => {
        try {
          return ethers.getAddress(address)
        } catch {
          return address
        }
      })()
      if (ethers.getAddress(wallet.address) !== ethers.getAddress(fromChecksum || wallet.address)) {
        throw new Error('The provided key/seed does not match the sender address')
      }

      // Unified provider selection prefers Alchemy (via getReadonlyProvider)
      const provider = getReadonlyProvider(network)
      const signer = wallet.connect(provider)

      setStage('broadcasting')
      let tx: ethers.TransactionResponse
      if (token.isNative) {
        tx = await signer.sendTransaction({ to, value: amountRaw })
      } else {
        if (!token.address) throw new Error('Missing token contract address')
        const erc20 = new ethers.Contract(token.address, erc20Abi, signer)
        tx = await erc20.transfer(to, amountRaw)
      }
      setTxHash(tx.hash)

      setStage('confirming')
      const receipt = await tx.wait()
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed or was reverted')
      }

      setReceipt(receipt)

      // compute fee in native coin if we can
      try {
        const gasUsed = receipt.gasUsed
        const eff = (receipt as any).effectiveGasPrice // ethers v6 on EIP-1559 networks
        if (typeof gasUsed === 'bigint' && typeof eff === 'bigint') {
          const feeWei = gasUsed * eff
          setFeeNative(ethers.formatEther(feeWei))
        }
      } catch {
        /* noop */
      }

      // get block timestamp for display
      try {
        const block = await provider.getBlock(receipt.blockNumber)
        if (block?.timestamp) setConfirmedAt(block.timestamp * 1000)
      } catch {
        /* noop */
      }

      setStage('success')
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to send transaction'
      setErrorMsg(msg)
      setStage('error')
    } finally {
      setIsSending(false)
    }
  }

  const DEMO_TX_HASH = '0xdeadbeefcafebabefeedface0000000000000000000000000000000000000000'

  const [runDemo, setRunDemo] = React.useState(false)

  React.useEffect(() => {
    if (!runDemo) return

    // reset
    setErrorMsg('')
    setIsSending(false)
    setTxHash(null)
    setStage('preparing')

    // schedule stage transitions
    const timeouts: NodeJS.Timeout[] = []
    let t = 0
    const step = (ms: number, fn: () => void) => {
      t += ms
      timeouts.push(setTimeout(fn, t))
    }

    step(800, () => setStage('broadcasting'))
    step(200, () => setTxHash(DEMO_TX_HASH)) // shortly after broadcasting, we "have a hash"
    step(900, () => setStage('confirming'))
    step(1400, () => setStage('success'))

    // cleanup
    return () => timeouts.forEach(clearTimeout)
  }, [runDemo])

  return (
    <Screen p="$3" gap="$3" px="$4">
      <YStack f={1} gap="$3">
        <BackHeader title="" />
        <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }} mb={12}>
          Enter amount to send
        </Text>

        <AmountInputCard
          amount={amount}
          onChangeAmount={setAmount}
          token={{
            symbol: token?.symbol,
            icon: token?.icon,
            network: token?.network,
            balance: token?.balance,
            name: token?.name
          }}
          error={invalid ? (tooBig ? 'Amount exceeds available balance.' : 'Enter a valid positive amount.') : ''}
        />

        {/* <Button accent fullWidth={false} onPress={() => setRunDemo(true)}>
          Run Stage Demo
        </Button> */}

        {stage !== 'idle' && (
          <TxProgressCard
            stage={stage}
            hasTxHash={!!txHash}
            txHash={txHash}
            from={address}
            to={to}
            amount={amount}
            tokenSymbol={token?.symbol}
            network={token?.network}
            feeNative={feeNative}
            confirmedAt={confirmedAt}
            onViewExplorer={
              txHash && token?.network ? () => WebBrowser.openBrowserAsync(explorerTxUrl(token.network!, txHash)) : null
            }
            onDone={
              stage === 'success'
                ? () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Portfolio', params: { address, mode: 'full' } }]
                    })
                : undefined
            }
          />
        )}

        {!!errorMsg && <Text color="#ef4444">{errorMsg}</Text>}
      </YStack>
      <Footer>
        {stage === 'success' ? (
          <YStack gap="$2">
            <Button
              accent
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'Portfolio', params: { address, mode: 'full' } }] })
              }
            >
              Done
            </Button>
          </YStack>
        ) : (
          <Button accent disabled={!canSend} onPress={handleSend} opacity={canSend ? 1 : 0.5}>
            {isSending ? (
              <XStack style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Spinner color="white" />
                <Text color="white" ml={8}>
                  {stage === 'preparing' && 'Preparing…'}
                  {stage === 'broadcasting' && 'Broadcasting…'}
                  {stage === 'confirming' && 'Waiting for confirmation…'}
                  {stage === 'error' && 'Retry'}
                </Text>
              </XStack>
            ) : (
              'Send'
            )}
          </Button>
        )}
      </Footer>
    </Screen>
  )
}
