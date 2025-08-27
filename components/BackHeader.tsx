import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { XStack, Stack, Text } from 'tamagui'

type Props = {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
}

export default function BackHeader({ title, onBack, right }: Props) {
  const navigation = useNavigation<any>()
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigation.goBack()
    }
  }
  return (
    <XStack height={48} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Stack
        width={44}
        height={44}
        style={{ alignItems: 'center', justifyContent: 'center' }}
        onPress={handleBack}
        pressStyle={{ opacity: 0.65 }}
      >
        <Ionicons name="chevron-back" size={26} />
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
