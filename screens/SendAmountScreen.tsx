import React, { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native'
import { YStack, XStack, Text, Input, Stack, Separator, Spinner } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import BackHeader from '../components/BackHeader'
import AssetIcon from '../components/AssetIcon'
import TxStages from '../components/TxStages'
import Button from '../components/ui/Button'
import { RootStackParamList } from '../types/types'
import { ethers } from 'ethers'
import * as WebBrowser from 'expo-web-browser'
import { erc20Abi, getReadonlyProvider, type SupportedNetworkKey } from '../providers/ethers'
import { useAppStore } from '../store/appStore'

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

const EXPLORER_BASE: Record<SupportedNetworkKey, string> = {
  mainnet: 'https://etherscan.io',
  optimism: 'https://optimistic.etherscan.io',
  arbitrum: 'https://arbiscan.io',
  base: 'https://basescan.org',
  polygon: 'https://polygonscan.com'
}

function explorerTxUrl(network: SupportedNetworkKey, hash: string) {
  return `${EXPLORER_BASE[network]}/tx/${hash}`
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
  const ephemeralWallet = useAppStore((s) => s.ephemeralWallet)

  const balanceNum = useMemo(() => Number(token?.balance ?? 0), [token])
  const amountNum = useMemo(() => Number(amount || '0'), [amount])

  const empty = amount.trim() === ''
  const tooBig = amountNum > balanceNum
  const notPositive = !(amountNum > 0)
  const invalid = (!empty && (Number.isNaN(amountNum) || notPositive)) || tooBig

  const canSend = !empty && !invalid && !!ephemeralWallet && !isSending

  // ---- formatting helpers ----
  function formatBalanceCompact(input?: string | number): string {
    const n = typeof input === 'string' ? Number(input) : Number(input ?? 0)
    if (!isFinite(n) || n === 0) return '0'
    const abs = Math.abs(n)
    if (abs >= 1) {
      // Show with thousands separators and up to 3 decimals
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
      }).format(n)
    }
    // abs < 1: preserve leading zeros then 3 significant digits
    const s = (typeof input === 'string' ? input : String(n)).replace(/^0+/, '0')
    const parts = s.split('.')
    if (parts.length === 1) return '0'
    const frac = parts[1] || ''
    const leadingZeros = frac.match(/^0+/)?.[0]?.length ?? 0
    const needed = leadingZeros + 3 // show 3 significant digits after the first non-zero
    const sliceLen = Math.min(frac.length, needed)
    const outFrac = frac.slice(0, sliceLen).replace(/0+$/, (m) => (sliceLen > leadingZeros ? m : ''))
    // Ensure we at least show the non-zero digit when present
    return `0.${outFrac || '0'}`
  }

  const MAX_INPUT_LEN = 24
  const MAX_DECIMALS = 8

  function sanitizeAmountInput(text: string): string {
    // Allow only digits and one decimal point; trim decimals
    let v = text.replace(/[^0-9.]/g, '')
    const firstDot = v.indexOf('.')
    if (firstDot !== -1) {
      // remove additional dots
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
      const [intPart, fracPart = ''] = v.split('.')
      v = `${intPart}.${fracPart.slice(0, MAX_DECIMALS)}`
    }
    // normalize leading zeros (keep "0." if they start with '.')
    if (v.startsWith('.')) v = `0${v}`
    // trim to max length overall
    if (v.length > MAX_INPUT_LEN) v = v.slice(0, MAX_INPUT_LEN)
    return v
  }

  function formatForInputFromBalance(balanceStr?: string): string {
    if (!balanceStr) return ''
    const [intPart, fracPart = ''] = String(balanceStr).split('.')
    let frac = fracPart.slice(0, MAX_DECIMALS).replace(/0+$/, '')
    let out = frac ? `${intPart}.${frac}` : intPart
    if (out.length > MAX_INPUT_LEN) {
      // If still too long, aggressively trim fraction
      const room = Math.max(0, MAX_INPUT_LEN - (intPart.length + 1))
      frac = frac.slice(0, room)
      out = room > 0 ? `${intPart}.${frac}` : intPart.slice(0, MAX_INPUT_LEN)
    }
    return out
  }

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

      setStage('success')
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to send transaction'
      setErrorMsg(msg)
      setStage('error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <YStack p="$3" gap="$3" flex={1} style={{ justifyContent: 'space-between' }}>
        <YStack gap="$3">
          <BackHeader title="" />
          <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }}>
            Enter amount to send
          </Text>

          {/* Pretty input block */}
          <Stack
            gap="$2"
            // Reserve space for the pill (top-right) and the balance row (bottom-right)
            p={12}
            pr={132}
            pb={36}
            borderWidth={1}
            borderColor="#e5e7eb"
            position="relative"
            style={{ borderRadius: 12 }}
          >
            <Input
              value={amount}
              onChangeText={(t) => setAmount(sanitizeAmountInput(t))}
              placeholder="0"
              keyboardType="decimal-pad"
              maxLength={MAX_INPUT_LEN}
              fontSize={28}
              borderColor="transparent"
              p={0}
              // prevent text underlapping the pill on the right
              px={0}
            />

            {/* Token pill top-right */}
            <XStack
              position="absolute"
              style={{
                top: 8,
                right: 8,
                alignItems: 'center',
                backgroundColor: '#f4f4f5',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999
              }}
              gap="$2"
            >
              <AssetIcon
                uri={token?.icon}
                fallbackText={(token?.symbol ?? '').slice(0, 3)}
                network={token?.network}
                size={20}
              />
              <Text fontWeight="700">{token?.symbol}</Text>
            </XStack>

            {/* Balance + Max bottom-right */}
            <XStack
              gap="$2"
              position="absolute"
              style={{ right: 8, bottom: 8, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {/* This was removed since AssetIcon handles its own badge now */}
              <Text color="#6b7280" numberOfLines={1}>
                {formatBalanceCompact(token?.balance)} {token?.symbol}
              </Text>
              <Pressable onPress={() => setAmount(formatForInputFromBalance(token?.balance))}>
                <Text style={{ backgroundColor: '#FC72FF22', borderRadius: 999 }} color="#FC72FF" px={8} py={2}>
                  Max
                </Text>
              </Pressable>
            </XStack>

            {/* Inline validation */}
            {invalid && (
              <Text color="#ef4444" mt={8}>
                {tooBig ? 'Amount exceeds available balance.' : 'Enter a valid positive amount.'}
              </Text>
            )}
          </Stack>
          {/* Stages list (appears during/after send) */}
          {stage !== 'idle' && <TxStages stage={stage} hasTxHash={!!txHash} />}

          {!!errorMsg && <Text color="#ef4444">{errorMsg}</Text>}
        </YStack>

        {/* Footer: action button or success state */}
        {stage === 'success' ? (
          <YStack gap="$2">
            <XStack
              borderWidth={1}
              borderColor="#10b981"
              px={12}
              py={6}
              style={{
                alignSelf: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9999,
                backgroundColor: '#ecfdf5'
              }}
            >
              <Text color="#065f46" fontSize={16}>
                Transaction confirmed
              </Text>
            </XStack>
            {txHash && token?.network ? (
              <Button onPress={() => WebBrowser.openBrowserAsync(explorerTxUrl(token.network!, txHash))} bg="#e5e7eb">
                <Text>View on Explorer</Text>
              </Button>
            ) : null}
            <Button
              bg="#111827"
              color="white"
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'Portfolio', params: { address, mode: 'full' } }] })
              }
            >
              Done
            </Button>
          </YStack>
        ) : (
          <Button bg="#111827" color="white" disabled={!canSend} onPress={handleSend} opacity={canSend ? 1 : 0.5}>
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
      </YStack>
    </KeyboardAvoidingView>
  )
}
