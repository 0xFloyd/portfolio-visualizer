// screens/PortfolioCoinGecko.tsx
import React, { useEffect, useMemo } from 'react'
import { YStack, XStack, Text, Button, ScrollView, Separator, Spinner } from 'tamagui'
import AssetIcon from '@/components/AssetIcon'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'

import { NETWORKS, type SupportedNetworkKey } from '../providers/ethers'

import { useAppStore, actions } from '../store/appStore'
import BackHeader from '../components/BackHeader'

import type { EnrichedHolding } from '../api/coingecko'

type FilterTab = 'all' | SupportedNetworkKey

export default function PortfolioCoinGecko() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const params = (route.params as any) || {}
  const addressFromStore = useAppStore((s) => s.address)
  const address = params.address || addressFromStore || '\'
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)
  const setAddress = useAppStore((s) => s.setAddress)
  const setMode = useAppStore((s) => s.setMode)
  const mode = useAppStore((s) => s.mode)
  const isLoading = useAppStore((s) => s.isPortfolioLoading)
  const enriched = useAppStore((s) => s.enrichedPortfolio)

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

  const tabs: FilterTab[] = ['all', 'mainnet', 'arbitrum', 'optimism', 'polygon']

  const filtered: EnrichedHolding[] = useMemo(() => {
    if (selectedNetwork === 'all') {
      const keys = Object.keys(NETWORKS) as SupportedNetworkKey[]
      return keys.flatMap((k) => enriched[k] ?? [])
    }
    return enriched[selectedNetwork as SupportedNetworkKey] ?? []
  }, [enriched, selectedNetwork])

  return (
    <YStack gap={12} style={{ flex: 1, padding: 16 }}>
      <BackHeader
        title="Portfolio (CoinGecko)"
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

      <ScrollView style={{ flex: 1 }}>
        <YStack style={{ paddingVertical: 4 }}>
          {isLoading ? (
            <YStack gap={8} style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner color="#111827" />
              <Text color="#6b7280">Fetching portfolio…</Text>
            </YStack>
          ) : (
            <>
              {filtered.map((a) => (
                <EnrichedRow key={a.id} asset={a} />
              ))}
              {filtered.length === 0 && (
                <Text color="#6b7280" style={{ marginTop: 12 }}>
                  No assets found on this filter.
                </Text>
              )}
            </>
          )}
        </YStack>
      </ScrollView>

      {mode === 'full' && (
        <Button
          onPress={() => navigation.navigate('SendRecipient', { address })}
          style={{ backgroundColor: '#111827', padding: 12, borderRadius: 8 }}
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
    case 'polygon':
      return 'Polygon'
  }
}

function EnrichedRow({ asset }: { asset: EnrichedHolding }) {
  const name = asset.isNative ? nativeName(asset.network) : asset.token?.name ?? 'Token'
  const symbol = asset.isNative ? nativeSymbol(asset.network) : asset.token?.symbol ?? ''
  const price = asset.priceUsd
  const value = asset.valueUsd

  return (
    <XStack style={{ alignItems: 'center', paddingVertical: 10 }}>
      <AssetIcon
        uri={asset.imageLarge || asset.imageSmall || asset.imageThumb}
        fallbackUri={asset.imageSmall || asset.imageThumb}
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
      return 'Ethereum'
    case 'arbitrum':
      return 'Ethereum'
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
