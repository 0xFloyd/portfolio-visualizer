import React from 'react'
import { XStack, Text, Image, ScrollView, Stack } from 'tamagui'
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
  const mini = 6 // each tiny icon
  const offset = ICON_SIZE - mini // position for col/row 2

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
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
      <XStack gap={8}>
        {tabs.map((tab) => {
          const isAll = tab === 'all'
          const pad = isAll ? { px: 12 } : { pl: '$2', pr: '$2' }

          return (
            <Button
              key={tab}
              onPress={() => onChange(tab)}
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
