import * as React from 'react'
import { createStackNavigator } from '@react-navigation/stack'

// Screens
import EntryScreen from '../screens/EntryScreen'
import ImportSeedScreen from '../screens/ImportSeedScreen'
import WatchAddressScreen from '../screens/WatchAddressScreen'
import TransactionScreen from '../screens/TransactionScreen'
import SendRecipientScreen from '../screens/SendRecipientScreen'
import SendTokenSelectScreen from '../screens/SendTokenSelectScreen'
import SendAmountScreen from '../screens/SendAmountScreen'
import { RootStackParamList } from '../types/types'
import PortfolioScreen from '../screens/PortfolioScreen'

const Stack = createStackNavigator<RootStackParamList>()

export default function StackNav() {
  return (
    <Stack.Navigator initialRouteName="Entry" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Entry" component={EntryScreen} />
      <Stack.Screen name="ImportSeed" component={ImportSeedScreen} />
      <Stack.Screen name="WatchAddress" component={WatchAddressScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="Transactions" component={TransactionScreen} />
      <Stack.Screen name="SendRecipient" component={SendRecipientScreen} />
      <Stack.Screen name="SendToken" component={SendTokenSelectScreen} />
      <Stack.Screen name="SendAmount" component={SendAmountScreen} />
    </Stack.Navigator>
  )
}
