import React, { useMemo } from 'react'
import { YStack, XStack, Text, Separator, ScrollView, Stack } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import AssetIcon from '../components/AssetIcon'
import BackHeader from '../components/BackHeader'
import { RootStackParamList } from '../types/types'
import { actions, useAppStore } from '../store/appStore'
import type { EnrichedHolding } from '../api/coingecko'
import type { SupportedNetworkKey } from '../providers/ethers'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'

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

  const holdings = useMemo(() => {
    if (selectedNetwork === 'all') {
      // Change under TODO step: Consolidate network iteration (item 4)
      const keys = NETWORK_KEYS as SupportedNetworkKey[]
      return keys.flatMap((k) => enriched[k] ?? [])
    }
    return enriched[selectedNetwork as SupportedNetworkKey] ?? []
  }, [enriched, selectedNetwork]) as EnrichedHolding[]

  return (
    <YStack flex={1} p="$3" gap="$3">
      <BackHeader title="" />
      <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }}>
        Select a token to send
      </Text>

      <Separator borderColor="#e5e7eb" />

      <ScrollView flex={1}>
        <YStack>
          {holdings.map((asset) => {
            // Change under TODO step: Replace switches (item 8)
            const symbol = asset.isNative ? CHAINS[asset.network].nativeSymbol : asset.token?.symbol ?? ''
            const name = asset.isNative ? CHAINS[asset.network].displayName : asset.token?.name ?? 'Token'
            const icon = asset.imageLarge || asset.imageSmall || asset.imageThumb
            const balance = asset.balanceFormatted

            return (
              <Stack
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
                py={10}
                pressStyle={{ opacity: 0.85 }}
              >
                <XStack style={{ alignItems: 'center' }}>
                  <Stack mr={12}>
                    <AssetIcon uri={icon} fallbackText={symbol.slice(0, 3)} network={asset.network} size={44} />
                  </Stack>
                  <YStack flex={1}>
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
              </Stack>
            )
          })}

          {holdings.length === 0 && (
            <Text color="#6b7280" mt="$3" style={{ textAlign: 'center' }}>
              No assets found.
            </Text>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
