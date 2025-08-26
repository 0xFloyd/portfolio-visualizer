import 'react-native-gesture-handler'
import 'react-native-reanimated'
import React from 'react'
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'
import * as ExpoLinking from 'expo-linking'

import StackNav from './components/StackNav'
import type { RootStackParamList } from './types/types'

const linking: LinkingOptions<RootStackParamList> = {
  // Use Expo's createURL so Snack/expo web subpaths are handled; include '/' fallback
  prefixes: [ExpoLinking.createURL('/'), '/'],
  config: {
    screens: {
      // Map Entry to the root path so web shows '/' instead of '/Entry'
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
    <TamaguiProvider defaultTheme="light" config={config}>
      <NavigationContainer linking={linking}>
        <StackNav />
      </NavigationContainer>
    </TamaguiProvider>
  )
}
