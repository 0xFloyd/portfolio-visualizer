import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { XStack, Stack, Text } from 'tamagui'
import { RootStackParamList } from '../types/types'

type Props = {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
  fallbackTo?: { name: keyof RootStackParamList; params?: any }
}

export default function BackHeader({ title, onBack, right, fallbackTo }: Props) {
  const navigation = useNavigation<any>()
  const handleBack = () => {
    if (onBack) return onBack()
    if (navigation.canGoBack()) return navigation.goBack()
    if (fallbackTo) return navigation.reset({ index: 0, routes: [fallbackTo] })
    navigation.reset({ index: 0, routes: [{ name: 'Entry' }] })
  }

  return (
    <XStack height={48} ai="center" jc="space-between">
      <Stack
        width={44}
        height={44}
        ai="center"
        jc="center"
        onPress={handleBack}
        pressStyle={{ opacity: 0.65 }}
        cursor="pointer"
      >
        <Ionicons name="arrow-back-sharp" size={26} color="#6b7280" />
      </Stack>
      {title ? (
        <Text fontSize={18} fontWeight="600">
          {title}
        </Text>
      ) : (
        <Stack width={44} />
      )}
      <Stack width={44}>{right}</Stack>
    </XStack>
  )
}
