import React, { useEffect, useMemo } from 'react'
import { FlatList, useWindowDimensions } from 'react-native'
import { YStack, XStack, Text, ScrollView, Separator, Spinner, Image, Stack } from 'tamagui'
import Button from '../components/ui/Button'
import AssetIcon from '../components/AssetIcon'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'

import type { SupportedNetworkKey } from '../providers/ethers'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'

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
    <YStack gap={12} flex={1} height={viewportHeight} p={16} position="relative">
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

      {/* <XStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Text color="#6b7280">{address}</Text>
        <Button
          onPress={() => navigation.navigate('Transactions', { address, mode })}
          style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 10, height: 32 }}
        >
          <Text>Transactions</Text>
        </Button>
      </XStack> */}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
        <XStack gap={8}>
          {tabs.map((tab) => (
            <Button
              key={tab}
              onPress={() => actions.setSelectedNetwork(tab)}
              accent={selectedNetwork === tab}
              width="auto"
              px={12}
              py={8}
              style={{ borderRadius: 16 }}
            >
              <XStack gap="$1" style={{ alignItems: 'center', justifyContent: 'center' }}>
                {tab !== 'all' ? (
                  <Image
                    source={CHAINS[tab as SupportedNetworkKey]?.badge}
                    width={14}
                    height={14}
                    borderRadius={7}
                    resizeMode="cover"
                    accessibilityLabel={`${tabLabel(tab)} logo`}
                  />
                ) : null}
                <Text color={selectedNetwork === tab ? 'white' : '#111827'}>{tabLabel(tab)}</Text>
              </XStack>
            </Button>
          ))}
        </XStack>
      </ScrollView>

      <Separator borderColor="#e5e7eb" />

      {cgPlaceholdersUsed ? (
        <XStack
          style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#f3f4f6' }}
          px={10}
          py={4}
          mt={4}
        >
          <Text color="#6b7280" fontSize={12}>
            This demo is using free tier APIs and is limited to fetching metadata images of 30 assets per minute —
            placeholders used in place.
          </Text>
        </XStack>
      ) : null}

      <YStack style={{ flexGrow: 0, flexShrink: 1, minHeight: 0, maxHeight: viewportHeight * 0.5 }}>
        {isLoading ? (
          <YStack gap={8} flex={1} py={24} style={{ alignItems: 'center', justifyContent: 'center' }}>
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
        <Stack position="absolute" style={{ left: 16, right: 16, bottom: 16 }}>
          <Button onPress={() => navigation.navigate('SendRecipient', { address })} accent>
            Send
          </Button>
        </Stack>
      )}
    </YStack>
  )
}
function tabLabel(t: FilterTab) {
  if (t === 'all') return 'All'
  // Change under TODO step: Replace switches (item 8)
  return CHAINS[t].displayName
}

function EnrichedRow({ asset }: { asset: AlchemyEnrichedHolding }) {
  const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
  const symbol = asset.isNative ? nativeSymbol(asset.network) : asset.token?.symbol ?? ''
  const price = asset.priceUsd
  const value = asset.valueUsd

  return (
    <XStack style={{ alignItems: 'center' }} py={10}>
      <Stack mr={12}>
        <AssetIcon
          uri={asset.imageLarge || asset.imageSmall || asset.imageThumb || asset.token?.logoURI}
          fallbackUri={asset.imageSmall || asset.imageThumb || asset.token?.logoURI}
          fallbackText={symbol.slice(0, 3)}
          network={asset.network}
          size={44}
        />
      </Stack>

      <YStack flex={1}>
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

// Change under TODO step: Replace switches (item 8)
const nativeName = (n: SupportedNetworkKey) => CHAINS[n].displayName
const nativeSymbol = (n: SupportedNetworkKey) => CHAINS[n].nativeSymbol
