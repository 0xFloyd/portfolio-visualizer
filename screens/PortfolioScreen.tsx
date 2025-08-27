import React, { useEffect, useMemo } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { YStack, XStack, Text, ScrollView, Separator, Spinner, Image, Stack } from 'tamagui'
import Button from '../components/ui/Button'
import AssetIcon from '../components/AssetIcon'
import AssetListRow from '../components/AssetListRow'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'

import type { SupportedNetworkKey } from '../providers/ethers'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'

import { useAppStore, actions } from '../store/appStore'
import BackHeader from '../components/BackHeader'
import NetworkTabs from '../components/NetworkTabs'
import InlineNotice from '../components/ui/InlineNotice'
import CenteredSpinner from '../components/ui/CenteredSpinner'
import Screen from '../components/ui/Screen'

import type { AlchemyEnrichedHolding } from '../providers/alchemy'

type FilterTab = 'all' | SupportedNetworkKey

export default function PortfolioAlchemy() {
  const { height: viewportHeight } = useWindowDimensions()
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const params = (route.params as any) || {}
  const addressFromStore = useAppStore((s) => s.address)
  const address = params.address || addressFromStore || ''
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)
  const setAddress = useAppStore((s) => s.setAddress)
  const setMode = useAppStore((s) => s.setMode)
  const mode = useAppStore((s) => s.mode)

  const isLoading = useAppStore((s) => s.isPortfolioLoading)
  const enriched = useAppStore((s) => s.enrichedPortfolio)
  const cgFilteredKeys = useAppStore((s) => s.cgFilteredKeys)
  const cgPlaceholdersUsed = useAppStore((s) => s.cgPlaceholdersUsed)
  const [showFiltered, setShowFiltered] = React.useState(false)

  // keep store in sync if address/mode came from params
  useEffect(() => {
    if (params.address && params.address !== addressFromStore) {
      setAddress(params.address)
    }
    if (params.mode) {
      setMode(params.mode)
    }
  }, [params.address, addressFromStore, params.mode])

  // trigger portfolio load via store (cached until address changes)
  useEffect(() => {
    if (!address) return
    actions.loadPortfolio(address)
  }, [address])

  // Change under TODO step: Consolidate network iteration (item 4)
  const tabs: FilterTab[] = ['all', ...(NETWORK_KEYS as SupportedNetworkKey[])]

  const { mainAssets, filteredAssets } = useMemo(() => {
    const all: AlchemyEnrichedHolding[] =
      selectedNetwork === 'all'
        ? (NETWORK_KEYS as SupportedNetworkKey[]).flatMap((k) => enriched[k] ?? [])
        : enriched[selectedNetwork as SupportedNetworkKey] ?? []

    const isFiltered = (a: AlchemyEnrichedHolding) => {
      const addr = a.token?.address?.toLowerCase?.()
      if (!addr) return false
      const key = `${a.network}:${addr}`
      return cgFilteredKeys.has(key)
    }
    const main = all.filter((a) => !isFiltered(a))
    const filt = all.filter((a) => isFiltered(a))
    return { mainAssets: main, filteredAssets: filt }
  }, [enriched, selectedNetwork, cgFilteredKeys])

  const data = useMemo(() => {
    return showFiltered ? [...mainAssets, ...filteredAssets] : mainAssets
  }, [mainAssets, filteredAssets, showFiltered])

  return (
    <Screen gap={12} height={viewportHeight} p={16} position="relative">
      <BackHeader
        title="Portfolio (Alchemy)"
        onBack={() => {
          if (mode === 'full') {
            navigation.navigate('ImportSeed')
          } else {
            navigation.navigate('WatchAddress')
          }
        }}
      />

      <NetworkTabs selected={selectedNetwork} onChange={(t) => actions.setSelectedNetwork(t)} />

      <Separator borderColor="#e5e7eb" />

      {cgPlaceholdersUsed ? (
        <InlineNotice variant="info">
          This demo is using free tier APIs and is limited to fetching metadata images of 30 assets per minute —
          placeholders used in place.
        </InlineNotice>
      ) : null}

      <YStack style={{ flexGrow: 0, flexShrink: 1, minHeight: 0, maxHeight: viewportHeight * 0.5 }}>
        {isLoading ? (
          <CenteredSpinner label="Fetching portfolio…" />
        ) : (
          <FlatList
            style={{ flexGrow: 0, maxHeight: viewportHeight * 0.5 }}
            data={data}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => (
              <AssetListRow
                asset={{
                  id: item.id,
                  name: item.isNative ? nativeName(item.network) : item.token?.name ?? 'Token',
                  symbol: item.isNative ? nativeSymbol(item.network) : item.token?.symbol ?? '',
                  iconUri: item.imageLarge || item.imageSmall || item.imageThumb || item.token?.logoURI,
                  network: item.network,
                  balanceFormatted: item.balanceFormatted,
                  priceUsd: item.priceUsd ?? null,
                  valueUsd: item.valueUsd ?? null
                }}
              />
            )}
            initialNumToRender={16}
            windowSize={10}
            maxToRenderPerBatch={24}
            updateCellsBatchingPeriod={50}
            showsVerticalScrollIndicator
            ListEmptyComponent={
              <Text color="#6b7280" style={{ marginTop: 12 }}>
                No assets found on this filter.
              </Text>
            }
            ListFooterComponent={
              filteredAssets.length > 0 ? (
                <YStack style={{ marginTop: 8, paddingBottom: 8 }}>
                  {!showFiltered ? (
                    <Text
                      color="#2563eb"
                      onPress={() => setShowFiltered(true)}
                      style={{ textDecorationLine: 'underline' }}
                    >
                      Show filtered assets ({filteredAssets.length})
                    </Text>
                  ) : (
                    <Text
                      color="#2563eb"
                      onPress={() => setShowFiltered(false)}
                      style={{ textDecorationLine: 'underline', marginBottom: 8 }}
                    >
                      Hide filtered assets
                    </Text>
                  )}
                </YStack>
              ) : null
            }
            contentContainerStyle={{ paddingVertical: 4, paddingBottom: mode === 'full' ? 96 : 12 }}
          />
        )}
      </YStack>

      {mode === 'full' && (
        <Stack position="absolute" style={{ left: 16, right: 16, bottom: 16 }}>
          <Button onPress={() => navigation.navigate('SendRecipient', { address })} accent>
            Send
          </Button>
        </Stack>
      )}
    </Screen>
  )
}

// Change under TODO step: Replace switches (item 8)
const nativeName = (n: SupportedNetworkKey) => CHAINS[n].displayName
const nativeSymbol = (n: SupportedNetworkKey) => CHAINS[n].nativeSymbol
