import React, { useState } from 'react'
import { YStack, Text, XStack } from 'tamagui'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import BackHeader from '../components/BackHeader'
import { actions } from '../store/appStore'
import { isAddress } from '../lib/utils'
import Button from '../components/ui/Button'
import AddressInput from '../components/ui/AddressInput'
import Screen from '../components/ui/Screen'
import Footer from '../components/ui/Footer'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function WatchAddressScreen() {
  const [addr, setAddr] = useState('')
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const canContinue = isAddress(addr)
  return (
    <Screen p="$3" gap="$3" px="$4">
      <YStack f={1} gap="$3">
        <BackHeader
          title=""
          onBack={() => {
            navigation.navigate('Entry')
          }}
        />

        <YStack gap="$3" px={36}>
          <XStack alignSelf="center" ai="center" jc="center" gap="$2" bg="$badge" p={8} borderRadius={8}>
            <MaterialCommunityIcons name="account-eye-outline" size={16} color="black" />
          </XStack>
          <Text fontSize={18} fontWeight="600" ta="center" mb={12}>
            Enter wallet address
          </Text>
        </YStack>

        <AddressInput
          value={addr}
          onChangeText={setAddr}
          placeholder="Type or paste wallet address"
          isValid={addr === '' ? undefined : canContinue}
        />
      </YStack>
      <Footer>
        <Button
          accent
          disabled={!canContinue}
          onPress={() => {
            const a = addr.trim()
            actions.setMode('watch')
            actions.setAddress(a)
            actions.loadPortfolio(a)
            navigation.replace('Portfolio', { address: a, mode: 'watch' })
          }}
          opacity={canContinue ? 1 : 0.5}
        >
          Continue
        </Button>
      </Footer>
    </Screen>
  )
}
