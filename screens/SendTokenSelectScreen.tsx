import React, { useMemo } from 'react'
import { YStack, XStack, Text, Separator, ScrollView, Stack } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import AssetIcon from '../components/AssetIcon'
import AssetListRow from '../components/AssetListRow'
import BackHeader from '../components/BackHeader'
import NetworkTabs from '../components/NetworkTabs'
import Screen from '../components/ui/Screen'
import { RootStackParamList } from '../types/types'
import { actions, useAppStore } from '../store/appStore'
import type { SupportedNetworkKey } from '../providers/ethers'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'
import { nativeName } from '../lib/utils'

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
  }, [enriched, selectedNetwork])

  return (
    <Screen p="$3" gap="$3">
      <BackHeader title="" />
      <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }}>
        Select a token to send
      </Text>

      <Separator borderColor="#e5e7eb" />
      <NetworkTabs selected={selectedNetwork} onChange={(t) => actions.setSelectedNetwork(t)} />

      <ScrollView flex={1}>
        <YStack>
          {holdings.map((asset) => {
            // Change under TODO step: Replace switches (item 8)
            const symbol = asset.isNative ? CHAINS[asset.network].nativeSymbol : asset.token?.symbol ?? ''
            const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
            const icon = asset.imageLarge || asset.imageSmall || asset.imageThumb
            const balance = asset.balanceFormatted

            return (
              <AssetListRow
                key={asset.id}
                asset={{ id: asset.id, name, symbol, iconUri: icon, network: asset.network, balanceFormatted: balance }}
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
              />
            )
          })}

          {holdings.length === 0 && (
            <Text color="#6b7280" mt="$3" style={{ textAlign: 'center' }}>
              No assets found.
            </Text>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  )
}
