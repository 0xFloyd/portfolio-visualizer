import React from 'react'
import { Pressable } from 'react-native'
import { XStack, YStack, Stack, Input, Text } from 'tamagui'
import AssetIcon from './AssetIcon'

const MAX_INPUT_LEN = 24
const MAX_DECIMALS = 8

export function sanitizeAmountInput(text: string) {
  let v = text.replace(/[^0-9.]/g, '')
  const firstDot = v.indexOf('.')
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
    const [intPart, fracPart = ''] = v.split('.')
    v = `${intPart}.${fracPart.slice(0, MAX_DECIMALS)}`
  }
  if (v.startsWith('.')) v = `0${v}`
  if (v.length > MAX_INPUT_LEN) v = v.slice(0, MAX_INPUT_LEN)
  return v
}

export function formatForInputFromBalance(balanceStr?: string) {
  if (!balanceStr) return ''
  const [intPart, fracPart = ''] = String(balanceStr).split('.')
  let frac = fracPart.slice(0, MAX_DECIMALS).replace(/0+$/, '')
  let out = frac ? `${intPart}.${frac}` : intPart
  if (out.length > MAX_INPUT_LEN) {
    const room = Math.max(0, MAX_INPUT_LEN - (intPart.length + 1))
    frac = frac.slice(0, room)
    out = room > 0 ? `${intPart}.${frac}` : intPart.slice(0, MAX_INPUT_LEN)
  }
  return out
}

function formatBalanceCompact(input?: string | number): string {
  const n = typeof input === 'string' ? Number(input) : Number(input ?? 0)
  if (!isFinite(n) || n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1) {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n)
  }
  const s = (typeof input === 'string' ? input : String(n)).replace(/^0+/, '0')
  const parts = s.split('.')
  if (parts.length === 1) return '0'
  const frac = parts[1] || ''
  const leadingZeros = frac.match(/^0+/)?.[0]?.length ?? 0
  const needed = leadingZeros + 3
  const sliceLen = Math.min(frac.length, needed)
  const outFrac = frac.slice(0, sliceLen).replace(/0+$/, (m) => (sliceLen > leadingZeros ? m : ''))
  return `0.${outFrac || '0'}`
}

type Props = {
  amount: string
  onChangeAmount: (v: string) => void
  token: { symbol?: string; icon?: string; network?: any; balance?: string; name?: string }
  error?: string | null
}

export default function AmountInputCard({ amount, onChangeAmount, token, error }: Props) {
  return (
    <Stack gap="$2" pt={8} px={12} pb={36} borderWidth={1} borderColor="#e5e7eb" position="relative" borderRadius={16}>
      <XStack ai="center" gap="$3" w={'100%'}>
        <Input
          focusStyle={{
            borderColor: '$accent',
            outlineColor: '$accent',
            outlineStyle: 'solid',
            outlineWidth: 1,
            outlineOffset: 1
          }}
          focusVisibleStyle={{
            borderColor: '$accent',
            outlineColor: '$accent',
            outlineStyle: 'solid',
            outlineWidth: 1,
            outlineOffset: 1
          }}
          value={amount}
          onChangeText={(t) => onChangeAmount(sanitizeAmountInput(t))}
          placeholder="0"
          keyboardType="decimal-pad"
          maxLength={MAX_INPUT_LEN}
          f={1}
          minWidth={0} // allow the input to shrink if needed
          size="$6"
          h={48}
          fontSize={28}
          bg="transparent"
          borderColor="transparent"
          p={0}
          px={0}
          style={{ textAlignVertical: 'center' }}
        />

        <XStack ml="auto">
          <XStack
            ai="center"
            gap="$2.5"
            bg="#f4f4f5"
            pr={8}
            pl={2}
            py={2}
            boxShadow="0 0 0 1px #e5e7eb"
            borderWidth={1}
            borderColor="#e5e7eb"
            borderRadius={9999}
            flexShrink={0}
          >
            <AssetIcon
              name={token?.name}
              uri={token?.icon}
              fallbackText={(token?.symbol ?? '').slice(0, 3)}
              network={token?.network}
              size={24}
            />
            <Text fontWeight="600" numberOfLines={1} fontSize={14}>
              {token?.symbol}
            </Text>
          </XStack>
        </XStack>
      </XStack>

      <XStack gap="$2" position="absolute" right={12} bottom={12} alignItems="center" justifyContent="flex-end">
        <Text color="#6b7280" numberOfLines={1}>
          {formatBalanceCompact(token?.balance)} {token?.symbol}
        </Text>
        <Pressable onPress={() => onChangeAmount(formatForInputFromBalance(token?.balance))}>
          <Text fontSize={12} bg="#FC72FF22" borderRadius={999} color="#FC72FF" px={8} py={4}>
            Max
          </Text>
        </Pressable>
      </XStack>

      {!!error && (
        <Text color="#ef4444" mt={8}>
          {error}
        </Text>
      )}
    </Stack>
  )
}
