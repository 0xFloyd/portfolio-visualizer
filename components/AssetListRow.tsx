import React from 'react'
import { XStack, YStack, Text, Stack } from 'tamagui'
import AssetIcon from './AssetIcon'
import { SupportedNetworkKey } from '../lib/utils'

export type AssetView = {
  id?: string
  name: string
  symbol: string
  iconUri?: string
  network?: SupportedNetworkKey
  balanceFormatted?: string | number
  priceUsd?: number | null
  valueUsd?: number | null
}

type Props = {
  asset: AssetView
  onPress?: () => void
}

const cleanSymbol = (raw?: string, max = 6) => {
  if (!raw) return ''
  // take the first chunk before common separators, then keep safe chars
  const first = raw.trim().split(/[\s|/\\,;:–-]+/)[0]
  const safe = first.replace(/[^A-Za-z0-9.$]/g, '') // allow A-Z 0-9 . $
  if (!safe) return ''
  return safe.length > max ? `${safe.slice(0, max)}…` : safe
}

const cleanName = (raw?: string, max = 28) => {
  if (!raw) return ''
  // remove urls / t.me etc
  const noUrls = raw.replace(/https?:\/\/\S+|t\.me\/\S+/gi, '')
  // take content before common separators scammers use
  const first = noUrls.split(/[\|\n]+/)[0]
  // trim leading emoji/symbol noise like ✅ 🚀 etc
  const noLeadEmoji = first.replace(/^[^A-Za-z0-9]+/, '')
  const compact = noLeadEmoji.replace(/\s+/g, ' ').trim()
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact
}

export default function AssetListRow({ asset, onPress }: Props) {
  const balanceNum =
    typeof asset.balanceFormatted === 'number' ? asset.balanceFormatted : Number(asset.balanceFormatted ?? 0)

  const balanceStr = balanceNum.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })

  const valueStr =
    asset.valueUsd != null ? `$${asset.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'

  const symbol = cleanSymbol(asset.symbol)
  const name = cleanName(asset.name)

  return (
    <YStack py={5} onPress={onPress} pressStyle={onPress ? { opacity: 0.85 } : undefined} minHeight={56} gap={1} pr={8}>
      <XStack ai="center" gap="$3">
        <Stack mr={4}>
          <AssetIcon
            name={asset.name}
            uri={asset.iconUri}
            fallbackText={asset.symbol.slice(0, 1)}
            network={asset.network}
            size={32}
          />
        </Stack>

        <Text f={1} numberOfLines={1} fontSize={16} fontWeight="500">
          {name}
        </Text>

        <Text fontSize={16} fontWeight="500" textAlign="right">
          {balanceStr} {symbol}
        </Text>
      </XStack>

      {(asset.priceUsd != null || asset.valueUsd != null) && (
        <XStack mt={-4}>
          <Stack f={1} />
          <Text color="#6b7280" textAlign="right">
            {valueStr}
          </Text>
        </XStack>
      )}
    </YStack>
  )
}
