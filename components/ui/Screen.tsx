import React from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { YStack, type YStackProps } from 'tamagui'

type ScreenProps = YStackProps & {
  // Allow disabling keyboard avoidance for purely scroll/list pages.
  avoidKeyboard?: boolean
}

const Screen = ({ avoidKeyboard = true, children, ...props }: ScreenProps) => {
  const content = (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1} p="$2" {...props}>
        {children}
      </YStack>
    </SafeAreaView>
  )

  if (!avoidKeyboard) return content

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined, web: undefined })}
    >
      {content}
    </KeyboardAvoidingView>
  )
}

export default Screen
