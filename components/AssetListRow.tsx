import React from 'react'
import { XStack, YStack, Text, Stack } from 'tamagui'
import AssetIcon from './AssetIcon'
import type { SupportedNetworkKey } from '../providers/ethers'

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
  return (
    <XStack
      style={{ alignItems: 'center' }}
      py={10}
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.85 } : undefined}
    >
      <Stack mr={12}>
        <AssetIcon uri={asset.iconUri} fallbackText={asset.symbol.slice(0, 3)} network={asset.network} size={44} />
      </Stack>

      <YStack flex={1}>
        <Text fontSize={16}>{asset.name}</Text>
        {asset.balanceFormatted != null && (
          <Text color="#6b7280">
            {Number(asset.balanceFormatted).toLocaleString(undefined, {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3
            })}{' '}
            {asset.symbol}
          </Text>
        )}
      </YStack>

      {(asset.priceUsd != null || asset.valueUsd != null) && (
        <YStack gap={2} style={{ alignItems: 'flex-end' }}>
          <Text fontSize={16} style={{ textAlign: 'right' }}>
            {asset.valueUsd != null
              ? `$${asset.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : '—'}
          </Text>
          <Text color="#6b7280" style={{ textAlign: 'right' }}>
            {asset.priceUsd != null
              ? `$${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
              : '—'}
          </Text>
        </YStack>
      )}
    </XStack>
  )
}
