import React from 'react'
import { Input, Text, YStack } from 'tamagui'

type Props = {
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  isValid?: boolean
  hint?: string
}

export default function AddressInput({
  value,
  onChangeText,
  placeholder = 'Type or paste wallet address',
  isValid,
  hint
}: Props) {
  const borderColor = isValid == null ? '#e5e7eb' : isValid ? '#e5e7eb' : '#ef4444'
  return (
    <YStack gap="$1">
      <Input
        focusStyle={{
          borderColor: '$accent',
          outlineColor: '$accent',
          outlineStyle: 'solid',
          outlineWidth: 1,
          outlineOffset: 1
        }}
        focusVisibleStyle={{
          borderColor: '$accent',
          outlineColor: '$accent',
          outlineStyle: 'solid',
          outlineWidth: 1,
          outlineOffset: 1
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        borderWidth={1}
        borderColor={borderColor}
        px={12}
        py={20}
        borderRadius={12}
      />
      {!!hint && <Text color="#6b7280">{hint}</Text>}
    </YStack>
  )
}
