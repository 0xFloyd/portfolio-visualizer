import React, { useMemo } from 'react'
import { Pressable } from 'react-native'
import { YStack, XStack, Text, Separator, ScrollView } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import AssetIcon from '@/components/AssetIcon'
import BackHeader from '@/components/BackHeader'
import { RootStackParamList } from '@/types/types'
import { actions, useAppStore } from '@/store/appStore'
import type { EnrichedHolding } from '@/api/coingecko'
import { NETWORKS, type SupportedNetworkKey } from '@/providers/ethers'

export default function SendTokenSelectScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { address, to } = (route.params as any) || {}

  // Use the same source as Portfolio list
  const enriched = useAppStore((s) => s.enrichedPortfolio)
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)

  // If coming here before portfolio has loaded, trigger it
  React.useEffect(() => {
    if (address) actions.loadPortfolio(address)
  }, [address])

  const holdings: EnrichedHolding[] = useMemo(() => {
    if (selectedNetwork === 'all') {
      const keys = Object.keys(NETWORKS) as SupportedNetworkKey[]
      return keys.flatMap((k) => enriched[k] ?? [])
    }
    return enriched[selectedNetwork as SupportedNetworkKey] ?? []
  }, [enriched, selectedNetwork])

  return (
    <YStack f={1} p="$3" gap="$3">
      <BackHeader title="" />
      <Text ta="center" fontSize={18} fontWeight="600">
        Select a token to send
      </Text>

      <Separator borderColor="#e5e7eb" />

      <ScrollView style={{ flex: 1 }}>
        <YStack>
          {holdings.map((asset) => {
            const symbol = asset.isNative ? 'ETH' : asset.token?.symbol ?? ''
            const name = asset.isNative ? 'Ethereum' : asset.token?.name ?? 'Token'
            const icon = asset.imageLarge || asset.imageSmall || asset.imageThumb
            const balance = asset.balanceFormatted

            return (
              <Pressable
                key={asset.id}
                onPress={() =>
                  navigation.navigate('SendAmount', {
                    address,
                    to,
                    token: {
                      symbol,
                      name,
                      balance,
                      icon,
                      network: asset.network,
                      address: asset.token?.address,
                      isNative: asset.isNative,
                      decimals: asset.token?.decimals ?? 18
                    }
                  } as any)
                }
                style={{ paddingVertical: 10 }}
              >
                <XStack ai="center">
                  <AssetIcon
                    uri={icon}
                    fallbackText={symbol.slice(0, 3)}
                    network={asset.network}
                    size={44}
                    style={{ marginRight: 12 }}
                  />
                  <YStack f={1}>
                    <Text fontSize={16}>{name}</Text>
                    <Text color="#6b7280">
                      {Number(balance).toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                      })}{' '}
                      {symbol}
                    </Text>
                  </YStack>
                </XStack>
              </Pressable>
            )
          })}

          {holdings.length === 0 && (
            <Text color="#6b7280" ta="center" mt="$3">
              No assets found.
            </Text>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
