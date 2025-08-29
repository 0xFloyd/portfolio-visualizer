import React from 'react'
import { YStack, Spinner, Text } from 'tamagui'

export default function CenteredSpinner({ label }: { label?: string }) {
  return (
    <YStack gap={8} py={24} ai="center" jc="center">
      <Spinner color="#111827" />
      {label ? <Text color="#6b7280">{label}</Text> : null}
    </YStack>
  )
}
