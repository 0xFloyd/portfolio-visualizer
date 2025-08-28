import React from 'react'
import { Pressable } from 'react-native'
import { XStack, Text, View } from 'tamagui'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}

export default function SegmentedOptions<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <XStack gap="$2">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={{ flex: 1 }} hitSlop={10}>
            <View
              p={10}
              borderRadius={8}
              borderWidth={1}
              borderColor={active ? '$accent' : '#e5e7eb'}
              bg={active ? '$accent' : 'transparent'}
            >
              <Text color={active ? 'white' : '#111827'} style={{ textAlign: 'center' }}>
                {opt.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </XStack>
  )
}

