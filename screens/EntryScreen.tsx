import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '../types/types'
import { Image, YStack } from 'tamagui'
import Button from '../components/ui/Button'
import Screen from '../components/ui/Screen'

export default function EntryScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  return (
    <Screen pt="$10" pb="$10">
      <YStack f={1} jc="center" ai="center">
        <YStack borderRadius={16} style={{ boxShadow: '0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)' }}>
          <Image
            source={require('../assets/images/uniswap-logo.png')}
            width={100}
            height={100}
            borderRadius={16}
            borderColor={'#FC72FF30'}
            borderWidth={1}
            boxShadow={'0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'}
          />
        </YStack>
      </YStack>

      <YStack gap="$2" w="80%" mx="auto">
        <Button fontWeight={600} accent onPress={() => navigation.navigate('ImportSeed')}>
          Import a wallet
        </Button>
        <Button fontWeight={600} bg="#22222214" color="black" onPress={() => navigation.navigate('WatchAddress')}>
          Watch an address
        </Button>
      </YStack>
    </Screen>
  )
}
