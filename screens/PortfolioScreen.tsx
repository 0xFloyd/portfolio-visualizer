import React, { useCallback, useEffect, useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { YStack, Text, Separator, XStack } from 'tamagui'
import Button from '../components/ui/Button'
import AssetListRow from '../components/AssetListRow'
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import { NETWORK_KEYS, SupportedNetworkKey } from '../lib/utils'
import { useAppStore, actions } from '../store/appStore'
import BackHeader from '../components/BackHeader'
import NetworkTabs from '../components/NetworkTabs'
import InlineNotice from '../components/ui/InlineNotice'
import CenteredSpinner from '../components/ui/CenteredSpinner'
import Screen from '../components/ui/Screen'
import Footer from '../components/ui/Footer'
import type { AlchemyEnrichedHolding } from '../providers/alchemy-data'
import { nativeName, nativeSymbol, shortenAddress } from '../lib/utils'
import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import VirtualizedAssetList from '../components/VirtualizedAssetList'

export default function PortfolioScreen() {
  const { height: viewportHeight } = useWindowDimensions()
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const params = (route.params as any) || {}
  const isFocused = useIsFocused()
  const addressFromStore = useAppStore((s) => s.address)
  const address = params.address || addressFromStore || ''
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)
  const setAddress = useAppStore((s) => s.setAddress)
  const setMode = useAppStore((s) => s.setMode)
  const mode = useAppStore((s) => s.mode)
  const wallet = useAppStore((s) => s.ephemeralWallet)

  const isLoading = useAppStore((s) => s.isPortfolioLoading)
  const enriched = useAppStore((s) => s.enrichedPortfolio)
  const cgFilteredKeys = useAppStore((s) => s.cgFilteredKeys)
  const cgPlaceholdersUsed = useAppStore((s) => s.cgPlaceholdersUsed)

  const shortAddr = useMemo(() => shortenAddress(address, 5, 4), [address])

  // keep store in sync if address/mode came from params to avoid re-renders
  useEffect(() => {
    if (!isFocused) return
    if (params.address && params.address !== addressFromStore) {
      setAddress(params.address)
    }
    if (params.mode && params.mode !== mode) {
      setMode(params.mode)
    }
  }, [isFocused, params.address, addressFromStore, params.mode, mode])

  useEffect(() => {
    if (!isFocused) return
    if (!address) return
    actions.loadPortfolio(address)
  }, [isFocused, address])

  const { mainAssets, filteredAssets } = useMemo(() => {
    const all: AlchemyEnrichedHolding[] =
      selectedNetwork === 'all'
        ? (NETWORK_KEYS as SupportedNetworkKey[]).flatMap((k) => enriched[k] ?? [])
        : enriched[selectedNetwork as SupportedNetworkKey] ?? []

    const sorted = [...all].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))

    const isFiltered = (a: AlchemyEnrichedHolding) => {
      const addr = a.token?.address?.toLowerCase?.()
      if (!addr) return false
      const key = `${a.network}:${addr}`
      return cgFilteredKeys.has(key)
    }
    const main = sorted.filter((a) => !isFiltered(a))
    const filt = sorted.filter((a) => isFiltered(a))
    return { mainAssets: main, filteredAssets: filt }
  }, [enriched, selectedNetwork, cgFilteredKeys])

  const toAssetView = useCallback(
    (item: AlchemyEnrichedHolding) => ({
      id: item.id,
      name: item.isNative ? nativeName(item.network) : item.token?.name ?? 'Token',
      symbol: item.isNative ? nativeSymbol(item.network) : item.token?.symbol ?? '',
      iconUri: item.imageLarge || item.imageSmall || item.imageThumb || item.token?.logoURI,
      network: item.network,
      balanceFormatted: item.balanceFormatted,
      priceUsd: item.priceUsd ?? null,
      valueUsd: item.valueUsd ?? null
    }),
    []
  )

  return (
    <Screen gap={12} height={viewportHeight} p={16} avoidKeyboard={false}>
      <YStack f={1} gap={12}>
        <XStack justifyContent="space-between" w="100%">
          <BackHeader
            onBack={() => {
              if (mode === 'full') {
                navigation.navigate('ImportSeed')
              } else {
                navigation.navigate('WatchAddress')
              }
            }}
          />
        </XStack>

        <YStack gap="$3" mb={20}>
          <XStack alignSelf="center" ai="center" jc="center" gap="$2" bg="#FC72FF30" p={10} borderRadius={999}>
            <MaterialIcons name="wallet" size={24} color="#FC72FF" />
          </XStack>
          {!!shortAddr && (
            <Text ta="center" numberOfLines={1} fontSize={20} fontWeight={500}>
              {shortAddr}
            </Text>
          )}
        </YStack>

        <NetworkTabs selected={selectedNetwork} onChange={(t) => actions.setSelectedNetwork(t)} />

        <Separator borderColor="#e5e7eb" />

        {cgPlaceholdersUsed ? (
          <InlineNotice variant="info" textProps={{ fontSize: 10, fontStyle: 'italic' }}>
            This demo is using free tier APIs and is limited to fetching metadata images of 30 assets per minute.
          </InlineNotice>
        ) : null}

        <YStack style={{ flexGrow: 0, flexShrink: 1, minHeight: 0, maxHeight: viewportHeight * 0.5 }}>
          <VirtualizedAssetList
            mainItems={mainAssets}
            filteredItems={filteredAssets}
            toAssetView={toAssetView}
            isLoading={isLoading}
            emptyText="No assets found on this filter."
            listStyle={{ flexGrow: 0, maxHeight: viewportHeight * 0.5 }}
            contentContainerStyle={{ paddingVertical: 4, paddingBottom: mode === 'full' ? 96 : 12 }}
            initialNumToRender={16}
            windowSize={10}
            maxToRenderPerBatch={24}
            updateCellsBatchingPeriod={50}
            showsVerticalScrollIndicator
          />
        </YStack>
      </YStack>
      {mode === 'full' && wallet && (
        <Footer>
          <Button
            w="auto"
            f={0}
            alignSelf="center"
            px="$4"
            fontSize={16}
            onPress={() => navigation.navigate('SendRecipient', { address })}
            accent
            borderRadius={16}
            icon={<FontAwesome name="send" size={16} color="white" />}
          >
            Send
          </Button>
        </Footer>
      )}
    </Screen>
  )
}
