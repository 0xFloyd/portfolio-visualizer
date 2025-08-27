import React from 'react'
import { XStack, YStack, Text, Stack } from 'tamagui'
import type { AssetHolding, SupportedNetworkKey } from '../providers/ethers'
import { CHAINS } from '../constants/chains'

type Props = {
  asset: AssetHolding
}

export default function AssetRow({ asset }: Props) {
  // Change under TODO step: Replace switches (item 8)
  const name = asset.isNative ? CHAINS[asset.network].displayName : asset.token?.name ?? 'Token'
  const symbol = asset.isNative ? CHAINS[asset.network].nativeSymbol : asset.token?.symbol ?? ''

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

      <YStack flex={1}>
        <Text fontSize={16}>{name}</Text>
        {/* <Text color="#6b7280">{symbol}</Text> */}
      </YStack>

      <XStack gap="$1.5">
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

// nativeName/nativeSymbol now sourced from CHAINS
