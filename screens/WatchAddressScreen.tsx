import React, { useState } from 'react'
import { Text } from 'react-native'
import { YStack, Input, Stack } from 'tamagui'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import BackHeader from '../components/BackHeader'
import { actions } from '../store/appStore'
import { isAddress } from '../lib/utils'
import Button from '../components/ui/Button'
import AddressInput from '../components/ui/AddressInput'
import Screen from '../components/ui/Screen'

export default function WatchAddressScreen() {
  const [addr, setAddr] = useState('')
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const canContinue = isAddress(addr)
  return (
    <Screen p="$3" gap="$3">
      <BackHeader
        title="Watch address"
        onBack={() => {
          // clear any global state tied to portfolio/address when leaving watch flow
          // (intentionally disabled to keep cache across navigation)
          navigation.navigate('Entry')
        }}
      />
      <Text style={{ fontSize: 18 }}>Enter wallet address</Text>
      <AddressInput value={addr} onChangeText={setAddr} isValid={addr === '' ? undefined : canContinue} />
      <Button
        accent
        disabled={!canContinue}
        onPress={() => {
          const a = addr.trim()
          actions.setMode('watch')
          actions.setAddress(a)
          actions.loadPortfolio(a)
          navigation.navigate('Portfolio', { address: a, mode: 'watch' })
        }}
        opacity={canContinue ? 1 : 0.5}
      >
        Continue
      </Button>
    </Screen>
  )
}
