import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, ScrollView as RNScrollView } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { YStack, XStack, Text, ScrollView, Separator, Spinner, Image } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import {
  type SupportedNetworkKey,
  fetchRecentTransactionsAllNetworks,
  type TxSummary,
  formatEther
} from '../providers/ethers'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'
import BackHeader from '../components/BackHeader'
import NetworkTabs from '../components/NetworkTabs'
import { explorerTxUrl } from '../lib/explorer'
import CenteredSpinner from '../components/ui/CenteredSpinner'
import Screen from '../components/ui/Screen'
import { useAppStore, actions } from '../store/appStore'
import Button from '../components/ui/Button'

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

  // Change under TODO step: Consolidate network iteration (item 4)
  const tabs: NetworkTab[] = ['all', ...(NETWORK_KEYS as SupportedNetworkKey[])]

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
      const keys = NETWORK_KEYS as SupportedNetworkKey[]
      const merged = keys.flatMap((k) => transactions[k] ?? [])
      return merged.sort((a, b) => b.timeStamp - a.timeStamp).slice(0, 10)
    }
    return (transactions[selectedNetwork] ?? []).slice(0, 10)
  }, [transactions, selectedNetwork])

  return (
    <Screen gap={12} p={16}>
      <BackHeader
        title="Transactions"
        onBack={() => {
          navigation.navigate('Portfolio', { address, mode })
        }}
      />
      <Text fontSize={18}>Transactions ({mode})</Text>
      <Text color="#6b7280">{address}</Text>
      <NetworkTabs selected={selectedNetwork} onChange={(t) => actions.setSelectedNetwork(t)} />
      <Separator borderColor="#e5e7eb" />

      {isLoading ? (
        <CenteredSpinner label="Fetching transactions…" />
      ) : filtered.length === 0 ? (
        <Text color="#6b7280" style={{ marginTop: 12 }}>
          No transactions found on this filter.
        </Text>
      ) : (
        <YStack borderWidth={1} borderColor="#e5e7eb" overflow="hidden" style={{ borderRadius: 8 }}>
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
    </Screen>
  )
}

function TxRow({ tx, index }: { tx: TxSummary; index: number }) {
  // Change under TODO step: Replace switches / centralize access (item 8)
  const symbol = CHAINS[tx.network].nativeSymbol
  const valueStr = formatEther(tx.value)
  const url = explorerTxUrl(tx.network, tx.hash)
  return (
    <XStack
      gap={8}
      px={10}
      height={48}
      style={{
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
        width={COLS.hash}
        color="#2563eb"
      >
        {tx.hash}
      </Text>
      <Text numberOfLines={1} width={COLS.block} color="#111827">
        {tx.blockNumber}
      </Text>
      <Text numberOfLines={1} width={COLS.age} color="#111827">
        {formatAge(tx.timeStamp)}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="middle" width={COLS.from} color="#6b7280">
        {tx.from}
      </Text>
      <XStack width={COLS.amount}>
        <Text flex={1} style={{ textAlign: 'right' }} color="#111827">
          {Number(valueStr).toLocaleString(undefined, { maximumFractionDigits: 5 })}
        </Text>
        <Text ml={6} color="#6b7280">
          {symbol}
        </Text>
      </XStack>
    </XStack>
  )
}

function tabLabel(t: NetworkTab) {
  if (t === 'all') return 'All'
  return CHAINS[t].displayName
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

// explorerTxUrl centralized in lib/explorer

function TableHeader() {
  return (
    <XStack
      gap={8}
      px={10}
      py={10}
      style={{ backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}
    >
      <Text numberOfLines={1} width={COLS.hash} fontWeight="600" color="#374151">
        Hash
      </Text>
      <Text numberOfLines={1} width={COLS.block} fontWeight="600" color="#374151">
        Block
      </Text>
      <Text numberOfLines={1} width={COLS.age} fontWeight="600" color="#374151">
        Age
      </Text>
      <Text numberOfLines={1} width={COLS.from} fontWeight="600" color="#374151">
        From
      </Text>
      <Text numberOfLines={1} width={COLS.amount} style={{ textAlign: 'right' }} fontWeight="600" color="#374151">
        Amount
      </Text>
    </XStack>
  )
}
