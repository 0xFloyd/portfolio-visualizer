import React from 'react'
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'
import * as ExpoLinking from 'expo-linking'
import StackNav from './components/StackNav'
import type { RootStackParamList } from './types/types'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const linking: LinkingOptions<RootStackParamList> = {
  // createURL so Snack web subpaths work
  prefixes: [ExpoLinking.createURL('/'), '/'],
  config: {
    screens: {
      Entry: '',
      ImportSeed: 'ImportSeed',
      WatchAddress: 'WatchAddress',
      Portfolio: 'Portfolio',
      Transactions: 'Transactions',
      SendRecipient: 'SendRecipient',
      SendToken: 'SendToken',
      SendAmount: 'SendAmount'
    }
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TamaguiProvider defaultTheme="light" config={config}>
        <NavigationContainer linking={linking}>
          <StackNav />
        </NavigationContainer>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
