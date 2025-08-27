import React from 'react'
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'
import * as ExpoLinking from 'expo-linking'
import StackNav from './components/StackNav'
import type { RootStackParamList } from './types/types'

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
    <TamaguiProvider defaultTheme="light" config={config}>
      <NavigationContainer linking={linking}>
        <StackNav />
      </NavigationContainer>
    </TamaguiProvider>
  )
}
