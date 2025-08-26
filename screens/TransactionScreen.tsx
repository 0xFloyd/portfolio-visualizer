import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, ScrollView as RNScrollView } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { YStack, XStack, Text, Button, ScrollView, Separator, Spinner } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import {
  NETWORKS,
  type SupportedNetworkKey,
  fetchRecentTransactionsAllNetworks,
  type TxSummary,
  formatEther
} from '../providers/ethers'
import BackHeader from '../components/BackHeader'
import { useAppStore, actions } from '../store/appStore'

type NetworkTab = 'all' | SupportedNetworkKey

const COLS = {
  hash: 200,
  block: 110,
  age: 90,
  from: 280,
  amount: 140
}
const TABLE_WIDTH = COLS.hash + COLS.block + COLS.age + COLS.from + COLS.amount + 4 * 8 // gaps

export default function TransactionScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const params = (route.params as any) || {}
  const addressFromStore = useAppStore((s) => s.address)
  const address = params.address || addressFromStore || ''
  const selectedNetwork = useAppStore((s) => s.selectedNetwork)
  const setAddress = useAppStore((s) => s.setAddress)
  const transactions = useAppStore((s) => s.transactions)
  const mode = params.mode || 'watch'
  const [isLoading, setIsLoading] = useState(false)

  // Ensure default tab is 'all' on mount
  useEffect(() => {
    if (selectedNetwork !== 'all') actions.setSelectedNetwork('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabs: NetworkTab[] = ['all', 'mainnet', 'arbitrum', 'optimism', 'polygon']

  useEffect(() => {
    if (params.address && params.address !== addressFromStore) {
      setAddress(params.address)
    }
  }, [params.address, addressFromStore])

  useEffect(() => {
    if (!address) return
    ;(async () => {
      setIsLoading(true)
      try {
        const recents = await fetchRecentTransactionsAllNetworks(address, 10)
        actions.setTransactions(recents)
      } catch (e) {
        // ignore; keep previous transactions on failure
      } finally {
        setIsLoading(false)
      }
    })()
  }, [address])

  const filtered: TxSummary[] = useMemo(() => {
    if (selectedNetwork === 'all') {
      const keys = Object.keys(NETWORKS) as SupportedNetworkKey[]
      const merged = keys.flatMap((k) => transactions[k] ?? [])
      return merged.sort((a, b) => b.timeStamp - a.timeStamp).slice(0, 10)
    }
    return (transactions[selectedNetwork] ?? []).slice(0, 10)
  }, [transactions, selectedNetwork])

  return (
    <YStack gap={12} style={{ flex: 1, padding: 16 }}>
      <BackHeader
        title="Transactions"
        onBack={() => {
          navigation.navigate('Portfolio', { address, mode })
        }}
      />
      <Text fontSize={18}>Transactions ({mode})</Text>
      <Text color="#6b7280">{address}</Text>
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

      {isLoading ? (
        <YStack gap={8} style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner color="#111827" />
          <Text color="#6b7280">Fetching transactions…</Text>
        </YStack>
      ) : filtered.length === 0 ? (
        <Text color="#6b7280" style={{ marginTop: 12 }}>
          No transactions found on this filter.
        </Text>
      ) : (
        <YStack style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <RNScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: TABLE_WIDTH }}>
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.network}:${item.hash}`}
              renderItem={({ item, index }) => <TxRow tx={item} index={index} />}
              ListHeaderComponent={<TableHeader />}
              stickyHeaderIndices={[0]}
            />
          </RNScrollView>
        </YStack>
      )}
    </YStack>
  )
}

function TxRow({ tx, index }: { tx: TxSummary; index: number }) {
  const symbol = NETWORKS[tx.network].nativeSymbol
  const valueStr = formatEther(tx.value)
  const url = explorerTxUrl(tx.network, tx.hash)
  return (
    <XStack
      gap={8}
      style={{
        paddingHorizontal: 10,
        height: 48,
        alignItems: 'center',
        backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
        borderTopWidth: index === 0 ? 0 : 1,
        borderTopColor: '#f3f4f6'
      }}
    >
      <Text
        onPress={() => WebBrowser.openBrowserAsync(url)}
        numberOfLines={1}
        ellipsizeMode="middle"
        style={{ width: COLS.hash, color: '#2563eb' }}
      >
        {tx.hash}
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.block, color: '#111827' }}>
        {tx.blockNumber}
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.age, color: '#111827' }}>
        {formatAge(tx.timeStamp)}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="middle" style={{ width: COLS.from, color: '#6b7280' }}>
        {tx.from}
      </Text>
      <XStack style={{ width: COLS.amount }}>
        <Text style={{ flex: 1, textAlign: 'right', color: '#111827' }}>
          {Number(valueStr).toLocaleString(undefined, { maximumFractionDigits: 5 })}
        </Text>
        <Text style={{ marginLeft: 6, color: '#6b7280' }}>{symbol}</Text>
      </XStack>
    </XStack>
  )
}

function tabLabel(t: NetworkTab) {
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

function shortHash(h: string) {
  if (!h) return ''
  return h.length > 12 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h
}

function shortAddress(a: string) {
  if (!a) return ''
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a
}

function formatAge(tsSec: number) {
  if (!tsSec) return '-'
  const now = Math.floor(Date.now() / 1000)
  const delta = Math.max(0, now - tsSec)
  const m = Math.floor(delta / 60)
  const h = Math.floor(delta / 3600)
  const d = Math.floor(delta / 86400)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return `${delta}s`
}

function explorerTxUrl(network: SupportedNetworkKey, hash: string) {
  const base: Record<SupportedNetworkKey, string> = {
    mainnet: 'https://etherscan.io',
    optimism: 'https://optimistic.etherscan.io',
    arbitrum: 'https://arbiscan.io',
    base: 'https://basescan.org',
    polygon: 'https://polygonscan.com'
  }
  return `${base[network]}/tx/${hash}`
}

function TableHeader() {
  return (
    <XStack
      gap={8}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
      }}
    >
      <Text numberOfLines={1} style={{ width: COLS.hash, fontWeight: '600', color: '#374151' }}>
        Hash
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.block, fontWeight: '600', color: '#374151' }}>
        Block
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.age, fontWeight: '600', color: '#374151' }}>
        Age
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.from, fontWeight: '600', color: '#374151' }}>
        From
      </Text>
      <Text numberOfLines={1} style={{ width: COLS.amount, textAlign: 'right', fontWeight: '600', color: '#374151' }}>
        Amount
      </Text>
    </XStack>
  )
}
