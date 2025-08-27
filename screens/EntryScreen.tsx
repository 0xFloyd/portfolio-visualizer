import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import { YStack, Image } from 'tamagui'
import Button from '../components/ui/Button'

export default function EntryScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  return (
    <YStack gap="$2" flex={1} p="$2" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Image source={require('../assets/images/uniswap-logo.png')} width={100} height={100} />
      <Button accent onPress={() => navigation.navigate('ImportSeed')}>
        Import Wallet (seed)
      </Button>
      <Button bg="#22222214" color="black" onPress={() => navigation.navigate('WatchAddress')}>
        Watch an address
      </Button>
    </YStack>
  )
}
