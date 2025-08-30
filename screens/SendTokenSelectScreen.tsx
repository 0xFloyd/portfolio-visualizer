import React, { useCallback, useEffect, useMemo } from 'react'
import { YStack, Text, Separator } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import AssetListRow from '../components/AssetListRow'
import BackHeader from '../components/BackHeader'
import NetworkTabs from '../components/NetworkTabs'
import CenteredSpinner from '../components/ui/CenteredSpinner'
import Screen from '../components/ui/Screen'
import { RootStackParamList } from '../types/types'
import { actions, useAppStore } from '../store/appStore'
import { NETWORK_KEYS, CHAINS, SupportedNetworkKey } from '../lib/utils'
import { nativeName } from '../lib/utils'
import type { AlchemyEnrichedHolding } from '../providers/alchemy-data'
import VirtualizedAssetList from '../components/VirtualizedAssetList'

export default function SendTokenSelectScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { address, to } = (route.params as any) || {}

  const enriched = useAppStore((s) => s.enrichedPortfolio)
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)
  const isLoading = useAppStore((s) => s.isPortfolioLoading)
  const cgFilteredKeys = useAppStore((s) => s.cgFilteredKeys)

  useEffect(() => {
    if (address) actions.loadPortfolio(address)
  }, [address])

  const holdings = useMemo(() => {
    if (selectedNetwork === 'all') {
      const keys = NETWORK_KEYS as SupportedNetworkKey[]
      return keys.flatMap((k) => enriched[k] ?? [])
    }
    return enriched[selectedNetwork as SupportedNetworkKey] ?? []
  }, [enriched, selectedNetwork])

  const { mainAssets, filteredAssets } = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    const isFiltered = (a: AlchemyEnrichedHolding) => {
      const addr = a.token?.address?.toLowerCase?.()
      if (!addr) return false
      const key = `${a.network}:${addr}`
      return cgFilteredKeys.has(key)
    }
    const main = sorted.filter((a) => !isFiltered(a))
    const filt = sorted.filter((a) => isFiltered(a))
    return { mainAssets: main, filteredAssets: filt }
  }, [holdings, cgFilteredKeys])

  const toAssetView = useCallback(
    (asset: AlchemyEnrichedHolding) => {
      const symbol = asset.isNative ? CHAINS[asset.network].nativeSymbol : asset.token?.symbol ?? ''
      const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
      const icon = asset.imageLarge || asset.imageSmall || asset.imageThumb || asset.token?.logoURI
      const balance = asset.balanceFormatted
      return {
        id: asset.id,
        name,
        symbol,
        iconUri: icon,
        network: asset.network,
        balanceFormatted: balance
      }
    },
    [CHAINS]
  )

  return (
    <Screen p="$3" gap="$3">
      <BackHeader title="" />
      <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }}>
        Select a token to send
      </Text>

      <Separator borderColor="#e5e7eb" />
      <NetworkTabs selected={selectedNetwork} onChange={(t) => actions.setSelectedNetwork(t)} />

      <YStack flex={1}>
        <VirtualizedAssetList
          mainItems={mainAssets}
          filteredItems={filteredAssets}
          toAssetView={toAssetView}
          isLoading={isLoading}
          emptyText="No assets found."
          contentContainerStyle={{ paddingVertical: 4, paddingBottom: 12 }}
          initialNumToRender={16}
          windowSize={10}
          maxToRenderPerBatch={24}
          updateCellsBatchingPeriod={50}
          showsVerticalScrollIndicator
          onPressItem={(asset) => {
            const symbol = asset.isNative ? CHAINS[asset.network].nativeSymbol : asset.token?.symbol ?? ''
            const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
            const icon = asset.imageLarge || asset.imageSmall || asset.imageThumb || asset.token?.logoURI
            const balance = asset.balanceFormatted
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
          }}
        />
      </YStack>
    </Screen>
  )
}
