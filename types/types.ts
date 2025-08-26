export type RootStackParamList = {
  Entry: undefined
  ImportSeed: undefined
  WatchAddress: undefined
  Portfolio: { address: string; mode: 'watch' | 'full' }
  Transactions: { address: string; mode: 'watch' | 'full' }
  SendRecipient: { address: string }
  SendToken: { address: string; to: string }
  SendAmount: {
    address: string
    to: string
    token: {
      symbol: string
      name: string
      balance: string
      icon?: string
      network?: any
      address?: string
      isNative?: boolean
      decimals?: number
    }
  }
}
