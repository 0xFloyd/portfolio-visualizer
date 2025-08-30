import React, { useEffect, useMemo, useState } from 'react'
import { FlatList, StyleProp, ViewStyle, Platform } from 'react-native'
import { YStack, Text } from 'tamagui'
import AssetListRow, { type AssetView } from './AssetListRow'
import CenteredSpinner from './ui/CenteredSpinner'

type ToAssetView<T> = (item: T) => AssetView

type Pair<T> = {
  raw: T
  view: AssetView
}

type Props<T> = {
  mainItems: T[]
  filteredItems?: T[]
  toAssetView: ToAssetView<T>
  onPressItem?: (item: T) => void
  isLoading?: boolean
  emptyText?: string
  contentContainerStyle?: StyleProp<ViewStyle>
  listStyle?: StyleProp<ViewStyle>
  maxHeight?: number
  initialNumToRender?: number
  windowSize?: number
  maxToRenderPerBatch?: number
  updateCellsBatchingPeriod?: number
  showsVerticalScrollIndicator?: boolean
}

export default function VirtualizedAssetList<T>({
  mainItems,
  filteredItems = [],
  toAssetView,
  onPressItem,
  isLoading = false,
  emptyText = 'No assets found.',
  contentContainerStyle,
  listStyle,
  maxHeight,
  initialNumToRender = 16,
  windowSize = 10,
  maxToRenderPerBatch = 24,
  updateCellsBatchingPeriod = 50,
  showsVerticalScrollIndicator = true
}: Props<T>) {
  const [showFiltered, setShowFiltered] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const styleId = 'asset-list-scrollbar-style'
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
        /* Firefox */
        #asset-list-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        #asset-list-scroll:hover { scrollbar-color: #FC72FF transparent; }
        /* Chromium/WebKit */
        #asset-list-scroll::-webkit-scrollbar { width: 6px; }
        #asset-list-scroll::-webkit-scrollbar-track { background: transparent; }
        #asset-list-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 9999px; }
        #asset-list-scroll:hover::-webkit-scrollbar-thumb { background-color: #FC72FF; }
      `
      document.head.appendChild(style)
    }
  }, [])

  const mainPairs = useMemo<Pair<T>[]>(
    () => mainItems.map((raw) => ({ raw, view: toAssetView(raw) })),
    [mainItems, toAssetView]
  )
  const filteredPairs = useMemo<Pair<T>[]>(
    () => filteredItems.map((raw) => ({ raw, view: toAssetView(raw) })),
    [filteredItems, toAssetView]
  )

  const data = useMemo<Pair<T>[]>(
    () => (showFiltered ? [...mainPairs, ...filteredPairs] : mainPairs),
    [mainPairs, filteredPairs, showFiltered]
  )

  if (isLoading) {
    return <CenteredSpinner label="Fetching portfolio…" />
  }

  return (
    <YStack flex={1}>
      <FlatList
        nativeID="asset-list-scroll"
        style={[{ flexGrow: 0 }, maxHeight != null ? { maxHeight } : undefined, listStyle]}
        data={data}
        keyExtractor={(pair, index) =>
          pair.view.id || `${pair.view.name}-${pair.view.symbol}-${pair.view.network}-${index}`
        }
        renderItem={({ item }) => (
          <AssetListRow asset={item.view} onPress={onPressItem ? () => onPressItem(item.raw) : undefined} />
        )}
        initialNumToRender={initialNumToRender}
        windowSize={windowSize}
        maxToRenderPerBatch={maxToRenderPerBatch}
        updateCellsBatchingPeriod={updateCellsBatchingPeriod}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        ListEmptyComponent={<Text color="#6b7280">{emptyText}</Text>}
        ListFooterComponent={
          filteredPairs.length > 0 ? (
            <YStack style={{ marginTop: 8, paddingBottom: 8 }}>
              {!showFiltered ? (
                <Text
                  color="$accent"
                  onPress={() => setShowFiltered(true)}
                  style={{ textDecorationLine: 'underline', cursor: 'pointer' }}
                >
                  Show filtered assets ({filteredPairs.length})
                </Text>
              ) : (
                <Text
                  color="$accent"
                  onPress={() => setShowFiltered(false)}
                  style={{ textDecorationLine: 'underline', marginBottom: 8, cursor: 'pointer' }}
                >
                  Hide filtered assets
                </Text>
              )}
            </YStack>
          ) : null
        }
        contentContainerStyle={contentContainerStyle}
      />
    </YStack>
  )
}
