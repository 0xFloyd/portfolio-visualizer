import React, { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { YStack, Text, Input } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Button from '@/components/ui/Button'
import BackHeader from '@/components/BackHeader'
import { RootStackParamList } from '@/types/types'

function isAddressLike(v: string) {
  return /^0x[a-fA-F0-9]{6,}$/.test(v.trim())
}

export default function SendRecipientScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const fromAddress = (route.params as any)?.address
  const [to, setTo] = useState('')

  const canContinue = useMemo(() => isAddressLike(to), [to])

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <YStack f={1} p="$3" gap="$3" jc="space-between">
        <YStack gap="$3">
          <BackHeader
            title=""
            onBack={() => navigation.navigate('Portfolio', { address: fromAddress, mode: 'full' })}
          />
          <Text ta="center" fontSize={18} fontWeight="600">
            Enter recipient address
          </Text>

          <Input value={to} onChangeText={setTo} placeholder="0x…" autoCapitalize="none" autoCorrect={false} />
        </YStack>

        <Button
          bg="#FC72FF"
          color="white"
          disabled={!canContinue}
          onPress={() => navigation.navigate('SendToken', { address: fromAddress, to })}
          style={{ opacity: canContinue ? 1 : 0.5 }}
        >
          Continue
        </Button>
      </YStack>
    </KeyboardAvoidingView>
  )
}
