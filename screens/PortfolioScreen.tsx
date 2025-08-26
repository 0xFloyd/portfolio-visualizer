import React, { useEffect, useMemo } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { YStack, XStack, Text, Button, ScrollView, Separator, Spinner } from 'tamagui'
import AssetIcon from '@/components/AssetIcon'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'

import { NETWORKS, type SupportedNetworkKey } from '../providers/ethers'

import { useAppStore, actions } from '../store/appStore'
import BackHeader from '../components/BackHeader'

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

  const tabs: FilterTab[] = ['all', 'mainnet', 'arbitrum', 'optimism', 'base', 'polygon']

  const { mainAssets, filteredAssets } = useMemo(() => {
    const all: AlchemyEnrichedHolding[] =
      selectedNetwork === 'all'
        ? (Object.keys(NETWORKS) as SupportedNetworkKey[]).flatMap((k) => enriched[k] ?? [])
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
    <YStack gap={12} style={{ flex: 1, height: viewportHeight, padding: 16, position: 'relative' }}>
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

      <XStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Text color="#6b7280">{address}</Text>
        <Button
          onPress={() => navigation.navigate('Transactions', { address, mode })}
          style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 10, height: 32 }}
        >
          <Text>Transactions</Text>
        </Button>
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} flex={0} style={{ flexGrow: 0, flexShrink: 0 }}>
        <XStack gap={8}>
          {tabs.map((tab) => (
            <Button
              key={tab}
              onPress={() => actions.setSelectedNetwork(tab)}
              style={{
                borderRadius: 16,
                paddingHorizontal: 12,
                backgroundColor: selectedNetwork === tab ? 'red' : '#e5e7eb'
              }}
            >
              <Text color={selectedNetwork === tab ? 'white' : '#111827'}>{tabLabel(tab)}</Text>
            </Button>
          ))}
        </XStack>
      </ScrollView>

      <Separator borderColor="#e5e7eb" />

      {cgPlaceholdersUsed ? (
        <XStack
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#f3f4f6',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginTop: 4
          }}
        >
          <Text color="#6b7280" fontSize={12}>
            This demo is using free tier APIs and is limited to fetching metadata images of 30 assets per minute —
            placeholders used in place.
          </Text>
        </XStack>
      ) : null}

      <YStack
        style={{
          flexGrow: 0,
          flexShrink: 1,
          minHeight: 0,
          maxHeight: viewportHeight * 0.5
        }}
      >
        {isLoading ? (
          <YStack gap={8} style={{ flex: 1, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Spinner color="#111827" />
            <Text color="#6b7280">Fetching portfolio…</Text>
          </YStack>
        ) : (
          <FlatList
            style={{ flexGrow: 0, maxHeight: viewportHeight * 0.5 }}
            data={data}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => <EnrichedRow asset={item} />}
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
        <Button
          onPress={() => navigation.navigate('SendRecipient', { address })}
          style={{
            backgroundColor: '#111827',
            padding: 12,
            borderRadius: 8,
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 16
          }}
        >
          <Text color="white" style={{ textAlign: 'center' }}>
            Send
          </Text>
        </Button>
      )}
    </YStack>
  )
}
function tabLabel(t: FilterTab) {
  switch (t) {
    case 'all':
      return 'All'
    case 'mainnet':
      return 'Ethereum'
    case 'arbitrum':
      return 'Arbitrum'
    case 'optimism':
      return 'Optimism'
    case 'base':
      return 'Base'
    case 'polygon':
      return 'Polygon'
  }
}

function EnrichedRow({ asset }: { asset: AlchemyEnrichedHolding }) {
  const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
  const symbol = asset.isNative ? nativeSymbol(asset.network) : asset.token?.symbol ?? ''
  const price = asset.priceUsd
  const value = asset.valueUsd

  return (
    <XStack style={{ alignItems: 'center', paddingVertical: 10 }}>
      <AssetIcon
        uri={asset.imageLarge || asset.imageSmall || asset.imageThumb || asset.token?.logoURI}
        fallbackUri={asset.imageSmall || asset.imageThumb || asset.token?.logoURI}
        fallbackText={symbol.slice(0, 3)}
        network={asset.network}
        size={44}
        style={{ marginRight: 12 }}
      />

      <YStack style={{ flex: 1 }}>
        <Text fontSize={16}>{name}</Text>
        <Text color="#6b7280">
          {Number(asset.balanceFormatted).toLocaleString(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
          })}{' '}
          {symbol}
        </Text>
      </YStack>

      <YStack gap={2} style={{ alignItems: 'flex-end' }}>
        <Text fontSize={16} style={{ textAlign: 'right' }}>
          {value != null ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
        </Text>
        <Text color="#6b7280" style={{ textAlign: 'right' }}>
          {price != null ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '—'}
        </Text>
      </YStack>
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
