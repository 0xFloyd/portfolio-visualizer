import React from 'react'
import { XStack, YStack, Text, Stack } from 'tamagui'
import type { AssetHolding, SupportedNetworkKey } from '../providers/ethers'

type Props = {
  asset: AssetHolding
}

export default function AssetRow({ asset }: Props) {
  const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
  const symbol = asset.isNative ? nativeSymbol(asset.network) : asset.token?.symbol ?? ''

  return (
    <XStack style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Stack
        width={44}
        height={44}
        style={{
          backgroundColor: '#eef2ff',
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}
      >
        {/* Placeholder icon. Could be replaced with proper chain/token icons. */}
        <Text fontWeight="600">{symbol.slice(0, 3)}</Text>
      </Stack>

      <YStack style={{ flex: 1 }}>
        <Text fontSize={16}>{name}</Text>
        {/* <Text color="#6b7280">{symbol}</Text> */}
      </YStack>

      <XStack gap="$1.5" verticalAlign="baseline">
        <Text fontSize={16} style={{ textAlign: 'right' }}>
          {Number(asset.balanceFormatted).toLocaleString(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
          })}
        </Text>
        <Text color="#6b7280" style={{ textAlign: 'right' }}>
          {symbol}
        </Text>
      </XStack>
    </XStack>
  )
}

function nativeName(network: SupportedNetworkKey) {
  switch (network) {
    case 'mainnet':
      return 'Ethereum'
    case 'polygon':
      return 'Polygon Matic'
    case 'optimism':
      return 'Optimism'
    case 'arbitrum':
      return 'Arbitrum'
    case 'base':
      return 'Base'
  }
}

function nativeSymbol(network: SupportedNetworkKey) {
  switch (network) {
    case 'mainnet':
      return 'ETH'
    case 'polygon':
      return 'MATIC'
    case 'optimism':
      return 'ETH'
    case 'arbitrum':
      return 'ETH'
    case 'base':
      return 'ETH'
  }
}
