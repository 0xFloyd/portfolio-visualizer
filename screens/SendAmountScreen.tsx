import React, { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native'
import { YStack, XStack, Text, Input, Stack, Separator, Spinner } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import BackHeader from '../components/BackHeader'
import AssetIcon from '../components/AssetIcon'
import TxStages from '../components/TxStages'
import Button from '../components/ui/Button'
import InlineNotice from '../components/ui/InlineNotice'
import AmountInputCard from '../components/AmountInputCard'
import { RootStackParamList } from '../types/types'
import { ethers } from 'ethers'
import * as WebBrowser from 'expo-web-browser'
import { erc20Abi, getReadonlyProvider, type SupportedNetworkKey } from '../providers/ethers'
import { explorerTxUrl } from '../lib/explorer'
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

// explorerTxUrl centralized in lib/explorer

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

  // Allow pressing "Send" when the amount is valid; if a signer is missing,
  // handle it inside handleSend() with a clear error instead of disabling the CTA.
  const canSend = !empty && !invalid && !isSending

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
          <AmountInputCard
            amount={amount}
            onChangeAmount={setAmount}
            token={{ symbol: token?.symbol, icon: token?.icon, network: token?.network, balance: token?.balance }}
            error={invalid ? (tooBig ? 'Amount exceeds available balance.' : 'Enter a valid positive amount.') : ''}
          />
          {/* Stages list (appears during/after send) */}
          {stage !== 'idle' && <TxStages stage={stage} hasTxHash={!!txHash} />}

          {!!errorMsg && <Text color="#ef4444">{errorMsg}</Text>}
        </YStack>

        {/* Footer: action button or success state */}
        {stage === 'success' ? (
          <YStack gap="$2">
            <InlineNotice variant="success">Transaction confirmed</InlineNotice>
            {txHash && token?.network ? (
              <Button onPress={() => WebBrowser.openBrowserAsync(explorerTxUrl(token.network!, txHash))} bg="#e5e7eb">
                <Text>View on Explorer</Text>
              </Button>
            ) : null}
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
      </YStack>
    </KeyboardAvoidingView>
  )
}
