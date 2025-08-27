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

export default function WatchAddressScreen() {
  const [addr, setAddr] = useState('')
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const canContinue = isAddress(addr)
  return (
    <YStack flex={1} p="$3" gap="$3">
      <BackHeader
        title="Watch address"
        onBack={() => {
          // clear any global state tied to portfolio/address when leaving watch flow
          // (intentionally disabled to keep cache across navigation)
          navigation.navigate('Entry')
        }}
      />
      <Text style={{ fontSize: 18 }}>Enter wallet address</Text>
      <Input
        value={addr}
        onChangeText={setAddr}
        placeholder="Type or paste wallet address"
        autoCapitalize="none"
        autoCorrect={false}
        borderWidth={1}
        borderColor="#d1d5db"
        p={12}
        style={{ borderRadius: 8 }}
      />
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
    </YStack>
  )
}
