import React from 'react'
import { YStack, type YStackProps } from 'tamagui'

type ContainerProps = YStackProps & {
  maxWidth?: number
}

export default function Container({ maxWidth = 576, children, ...props }: ContainerProps) {
  return (
    <YStack f={1} ai="center" minHeight={0}>
      <YStack f={1} w="100%" maxWidth={maxWidth} {...props} minHeight={0}>
        {children}
      </YStack>
    </YStack>
  )
}
