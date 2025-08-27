import React, { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { YStack, Text, Input } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Button from '../components/ui/Button'
import { isAddress } from '../lib/utils'
import BackHeader from '../components/BackHeader'
import { RootStackParamList } from '../types/types'
import AddressInput from '../components/ui/AddressInput'
import Screen from '../components/ui/Screen'

// Change under TODO step: Address validation util (item 7)
const isAddressLike = isAddress

export default function SendRecipientScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const fromAddress = (route.params as any)?.address
  const [to, setTo] = useState('')

  const canContinue = useMemo(() => isAddressLike(to), [to])

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <Screen p="$3" gap="$3" style={{ justifyContent: 'space-between' }}>
        <YStack gap="$3">
          <BackHeader
            title=""
            onBack={() => navigation.navigate('Portfolio', { address: fromAddress, mode: 'full' })}
          />
          <Text fontSize={18} fontWeight="600" style={{ textAlign: 'center' }}>
            Enter recipient address
          </Text>

          <AddressInput
            value={to}
            onChangeText={setTo}
            placeholder="0x…"
            isValid={to === '' ? undefined : canContinue}
          />
        </YStack>

        <Button
          accent
          disabled={!canContinue}
          onPress={() => navigation.navigate('SendToken', { address: fromAddress, to })}
          opacity={canContinue ? 1 : 0.5}
        >
          Continue
        </Button>
      </Screen>
    </KeyboardAvoidingView>
  )
}
