import React, { useCallback, useEffect, useRef, useState } from 'react'
import { XStack, Text, Image, ScrollView, Stack } from 'tamagui'
import { Platform } from 'react-native'
import Button from './ui/Button'
import { NETWORK_KEYS, CHAINS, SupportedNetworkKey } from '../lib/utils'

type Tab = 'all' | SupportedNetworkKey

type Props = {
  selected: Tab
  onChange: (t: Tab) => void
  tabs?: Tab[]
}

const defaultTabs: Tab[] = ['all', ...(NETWORK_KEYS as SupportedNetworkKey[])]

const ICON_SIZE = 14

function AllIconGrid() {
  const nets = (NETWORK_KEYS as SupportedNetworkKey[]).slice(0, 4)
  const mini = 6
  const offset = ICON_SIZE - mini

  return (
    <Stack w={ICON_SIZE} h={ICON_SIZE} position="relative">
      {nets.map((n, i) => {
        const row = i > 1 ? 1 : 0
        const col = i % 2
        return (
          <Image
            key={n}
            source={CHAINS[n]?.badge}
            width={mini}
            height={mini}
            borderRadius={mini / 2}
            position="absolute"
            left={col ? offset : 0}
            top={row ? offset : 0}
            pointerEvents="none"
            accessibilityLabel={`${CHAINS[n]?.displayName} logo`}
          />
        )
      })}
    </Stack>
  )
}

export default function NetworkTabs({ selected, onChange, tabs = defaultTabs }: Props) {
  const isWeb = Platform.OS === 'web'
  const scrollRef = useRef<any>(null)
  const isDraggingRef = useRef(false)
  const isPointerDownRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollXRef = useRef(0)
  const lastDragEndAtRef = useRef(0)
  const latestScrollXRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const DRAG_THRESHOLD = 6

  useEffect(() => {
    if (!isWeb) return
    const styleId = 'network-tabs-scrollbar-style'
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
        /* Firefox */
        #network-tabs-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        #network-tabs-scroll:hover { scrollbar-color: #FC72FF transparent; }
        /* Chromium/WebKit */
        #network-tabs-scroll::-webkit-scrollbar { height: 4px; }
        #network-tabs-scroll::-webkit-scrollbar-track { background: transparent; }
        #network-tabs-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 9999px; }
        #network-tabs-scroll:hover::-webkit-scrollbar-thumb { background-color: #FC72FF; }
      `
      document.head.appendChild(style)
    }
  }, [isWeb])

  const handleScroll = useCallback((e: any) => {
    latestScrollXRef.current = e?.nativeEvent?.contentOffset?.x ?? 0
  }, [])

  const onPointerDown = useCallback(
    (e: any) => {
      if (!isWeb) return
      isPointerDownRef.current = true
      isDraggingRef.current = false
      setDragging(false)
      dragStartXRef.current = e?.nativeEvent?.clientX ?? 0
      dragStartScrollXRef.current = latestScrollXRef.current
    },
    [isWeb]
  )

  const onPointerMove = useCallback(
    (e: any) => {
      if (!isWeb) return
      if (!isPointerDownRef.current) return
      const clientX = e?.nativeEvent?.clientX ?? 0
      const deltaFromStart = clientX - dragStartXRef.current
      if (!isDraggingRef.current) {
        if (Math.abs(deltaFromStart) <= DRAG_THRESHOLD) return
        // Begin dragging once threshold is crossed
        isDraggingRef.current = true
        setDragging(true)
        // Reset anchors to avoid a jump on first drag frame
        dragStartXRef.current = clientX
        dragStartScrollXRef.current = latestScrollXRef.current
      }
      const deltaX = clientX - dragStartXRef.current
      const nextX = dragStartScrollXRef.current - deltaX
      scrollRef.current?.scrollTo?.({ x: nextX, animated: false })
      e?.preventDefault?.()
    },
    [isWeb]
  )

  const endDrag = useCallback(() => {
    if (!isWeb) return
    isPointerDownRef.current = false
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setDragging(false)
      lastDragEndAtRef.current = Date.now()
    }
  }, [isWeb])

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator
      nativeID="network-tabs-scroll"
      flexGrow={0}
      flexShrink={0}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: isWeb ? 6 : 0 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
    >
      <XStack gap={8}>
        {tabs.map((tab) => {
          const isAll = tab === 'all'
          const pad = isAll ? { px: 12 } : { pl: '$2', pr: '$2' }

          return (
            <Button
              key={tab}
              onPress={() => {
                if (Platform.OS === 'web' && Date.now() - lastDragEndAtRef.current < 200) return
                onChange(tab)
              }}
              accent={selected === tab}
              w="auto"
              {...pad}
              py={0}
              size="$2"
              borderRadius={8}
              fontSize={14}
            >
              <XStack gap={isAll ? '$2' : '$1'} ai="center" jc="center">
                {isAll ? (
                  <AllIconGrid />
                ) : (
                  <Image
                    source={CHAINS[tab as SupportedNetworkKey]?.badge}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    borderRadius={ICON_SIZE / 2}
                    accessibilityLabel={`${CHAINS[tab as SupportedNetworkKey].displayName} logo`}
                  />
                )}
                <Text color={selected === tab ? 'white' : '#111827'}>
                  {tab === 'all' ? 'All' : CHAINS[tab as SupportedNetworkKey].displayName}
                </Text>
              </XStack>
            </Button>
          )
        })}
      </XStack>
    </ScrollView>
  )
}
