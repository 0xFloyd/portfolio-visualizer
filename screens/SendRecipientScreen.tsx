import React, { useMemo, useState } from 'react'
import { YStack, Text, XStack } from 'tamagui'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Button from '../components/ui/Button'
import { isAddress } from '../lib/utils'
import BackHeader from '../components/BackHeader'
import { RootStackParamList } from '../types/types'
import AddressInput from '../components/ui/AddressInput'
import Screen from '../components/ui/Screen'
import Footer from '../components/ui/Footer'
import { FontAwesome } from '@expo/vector-icons'
import { actions } from '../store/appStore'

export default function SendRecipientScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const fromAddress = (route.params as any)?.address
  const [to, setTo] = useState('')

  const canContinue = useMemo(() => isAddress(to), [to])

  return (
    <Screen p="$3" gap="$3" px="$4">
      <YStack f={1} gap="$3">
        <BackHeader title="" onBack={() => navigation.navigate('Portfolio', { address: fromAddress, mode: 'full' })} />
        <YStack gap="$3" px={36}>
          <XStack alignSelf="center" ai="center" jc="center" gap="$2" bg="$badge" p={8} borderRadius={8}>
            <FontAwesome name="send" size={16} color="black" />
          </XStack>
          <Text fontSize={18} fontWeight="600" ta="center" mb={12}>
            Enter recipient address
          </Text>
        </YStack>

        <AddressInput
          value={to}
          onChangeText={setTo}
          placeholder="Type or paste wallet address"
          isValid={to === '' ? undefined : canContinue}
        />
      </YStack>
      <Footer>
        <Button
          accent
          disabled={!canContinue}
          onPress={() => {
            actions.setSendTo(to)
            navigation.navigate('SendToken', { address: fromAddress, to })
          }}
          opacity={canContinue ? 1 : 0.5}
        >
          Continue
        </Button>
      </Footer>
    </Screen>
  )
}
