import React, { useEffect } from 'react'
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'
import * as ExpoLinking from 'expo-linking'
import StackNav from './components/StackNav'
import type { RootStackParamList } from './types/types'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import PrintAscii from './components/PrintAscii'
import Container from './components/ui/Container'
import { Platform } from 'react-native'

const linking: LinkingOptions<RootStackParamList> = {
  // createURL so Snack web subpaths work
  prefixes: [ExpoLinking.createURL('/'), '/'],
  config: {
    screens: {
      Entry: '',
      ImportSeed: 'import-seed',
      WatchAddress: 'watch-address',
      Portfolio: 'portfolio',
      Transactions: 'transactions',
      SendRecipient: 'send-recipient',
      SendToken: 'send-token',
      SendAmount: 'send-amount'
    }
  }
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const color = 'rgb(242, 242, 242)'
      try {
        document.documentElement.style.backgroundColor = color
        document.body.style.backgroundColor = color
        document.body.style.margin = '0'
      } catch {}
    }
  }, [])

  return (
    <SafeAreaProvider>
      <TamaguiProvider defaultTheme="light" config={config}>
        <Container maxWidth={576}>
          <NavigationContainer linking={linking}>
            <StackNav />
            <PrintAscii />
          </NavigationContainer>
        </Container>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
