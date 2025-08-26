import React, { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import BackHeader from '../components/BackHeader'
import { actions } from '../store/appStore'

function isAddressLike(v: string) {
  return /^0x[a-fA-F0-9]{6,}$/.test(v.trim())
}

export default function WatchAddressScreen() {
  const [addr, setAddr] = useState('')
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const canContinue = isAddressLike(addr)
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <BackHeader
        title="Watch address"
        onBack={() => {
          // clear any global state tied to portfolio/address when leaving watch flow
          // (intentionally disabled to keep cache across navigation)
          navigation.navigate('Entry')
        }}
      />
      <Text style={{ fontSize: 18 }}>Enter wallet address</Text>
      <TextInput
        value={addr}
        onChangeText={setAddr}
        placeholder="Type or paste wallet address"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8 }}
      />
      <Pressable
        disabled={!canContinue}
        onPress={() => {
          const a = addr.trim()
          actions.setMode('watch')
          actions.setAddress(a)
          actions.loadPortfolio(a)
          navigation.navigate('Portfolio', { address: a, mode: 'watch' })
        }}
        style={{ opacity: canContinue ? 1 : 0.5, backgroundColor: '#111827', padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Continue</Text>
      </Pressable>
    </View>
  )
}
