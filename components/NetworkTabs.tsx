import React from 'react'
import { XStack, Text, Image, ScrollView } from 'tamagui'
import Button from './ui/Button'
import { NETWORK_KEYS, CHAINS } from '../constants/chains'
import type { SupportedNetworkKey } from '../providers/ethers'

type Tab = 'all' | SupportedNetworkKey

type Props = {
  selected: Tab
  onChange: (t: Tab) => void
  tabs?: Tab[]
}

const defaultTabs: Tab[] = ['all', ...(NETWORK_KEYS as SupportedNetworkKey[])]

export default function NetworkTabs({ selected, onChange, tabs = defaultTabs }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }}>
      <XStack gap={8}>
        {tabs.map((tab) => (
          <Button
            key={tab}
            onPress={() => onChange(tab)}
            accent={selected === tab}
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
                  accessibilityLabel={`${tab === 'all' ? 'All' : CHAINS[tab as SupportedNetworkKey].displayName} logo`}
                />
              ) : null}
              <Text color={selected === tab ? 'white' : '#111827'}>
                {tab === 'all' ? 'All' : CHAINS[tab as SupportedNetworkKey].displayName}
              </Text>
            </XStack>
          </Button>
        ))}
      </XStack>
    </ScrollView>
  )
}
