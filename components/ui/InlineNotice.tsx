import React from 'react'
import { XStack, Text, type XStackProps, type TextProps } from 'tamagui'

type Variant = 'info' | 'success' | 'warning' | 'error'

const styles: Record<Variant, { bg: string; border: string; color: string }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
  success: { bg: '#ecfdf5', border: '#10b981', color: '#065f46' },
  warning: { bg: '#fffbeb', border: '#fbbf24', color: '#92400e' },
  error: { bg: '#fef2f2', border: '#fecaca', color: '#ef4444' }
}

type InlineNoticeProps = XStackProps & {
  variant?: Variant
  textProps?: TextProps
}

export default function InlineNotice({
  children,
  variant = 'info',
  px = 10,
  py = 6,
  textProps,
  ...props
}: InlineNoticeProps) {
  const s = styles[variant]
  const tProps: TextProps = { fontSize: 12, ...textProps }
  return (
    <XStack
      borderWidth={1}
      borderColor={s.border}
      px={px}
      py={py}
      gap="$3"
      ai="center"
      bg={s.bg}
      borderRadius={16}
      justifyContent="center"
      // alignSelf="flex-start"
      {...props}
    >
      <Text color={s.color} {...tProps}>
        {children}
      </Text>
    </XStack>
  )
}
