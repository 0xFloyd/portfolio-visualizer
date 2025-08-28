import React from 'react'
import { XStack, Text } from 'tamagui'

type Variant = 'info' | 'success' | 'warning' | 'error'

const styles: Record<Variant, { bg: string; border: string; color: string }> = {
  info: { bg: '#f3f4f6', border: '#e5e7eb', color: '#374151' },
  success: { bg: '#ecfdf5', border: '#10b981', color: '#065f46' },
  warning: { bg: '#fffbeb', border: '#fbbf24', color: '#92400e' },
  error: { bg: '#fef2f2', border: '#fecaca', color: '#ef4444' }
}

export default function InlineNotice({ children, variant = 'info' as Variant, px = 10, py = 6, ...props }: any) {
  const s = styles[variant]
  return (
    <XStack
      borderWidth={1}
      borderColor={s.border}
      px={px}
      py={py}
      gap="$6"
      ai="center"
      bg={s.bg}
      borderRadius={16}
      justifyContent="center"
      // alignSelf="flex-start"
      {...props}
    >
      <Text color={s.color}>{children}</Text>
    </XStack>
  )
}
