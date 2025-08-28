import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack, type YStackProps } from 'tamagui'

type FooterProps = YStackProps & {
  insetBottomMin?: number
}

const Footer = ({ insetBottomMin = 12, children, style, ...props }: FooterProps) => {
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, insetBottomMin)
  return (
    <YStack w="100%" gap="$2" pt="$2" {...props} style={[{ paddingBottom: bottom }, style]}>
      {children}
    </YStack>
  )
}

export default Footer

