import React from 'react'
import { XStack, YStack, Text, Stack } from 'tamagui'
import AssetIcon from './AssetIcon'
import { cleanName, cleanSymbol, SupportedNetworkKey } from '../lib/utils'

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
