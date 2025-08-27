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
  const borderColor = isValid == null ? '#d1d5db' : isValid ? '#10b981' : '#ef4444'
  return (
    <YStack gap="$1">
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        borderWidth={1}
        borderColor={borderColor}
        p={12}
        style={{ borderRadius: 8 }}
      />
      {!!hint && <Text color="#6b7280">{hint}</Text>}
    </YStack>
  )
}
