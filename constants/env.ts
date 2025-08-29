import Constants from 'expo-constants'

type EnvShape = {
  ETHERSCAN_API_KEY: string
  COINGECKO_API_KEY: string
  ALCHEMY_API_KEY: string
}

export const ALCHEMY_API_KEY = ''
export const ETHERSCAN_API_KEY = ''
export const COINGECKO_API_KEY = ''

function pick(...vals: Array<string | undefined | null>): string {
  for (const v of vals) if (typeof v === 'string' && v.length > 0) return v
  return ''
}

// Precedence order for resolving env values:
// 1) Hardcoded consts below (used on Snack; leave empty locally)
// 2) Expo config extras (from app.config.ts -> expo-constants)
const extra: any = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || {}

declare const process: any
const PUB = {
  ETHERSCAN_API_KEY:
    (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY) || undefined,
  COINGECKO_API_KEY:
    (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_COINGECKO_API_KEY) || undefined,
  ALCHEMY_API_KEY:
    (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) || undefined
}

const PLAIN = {
  ETHERSCAN_API_KEY: (typeof process !== 'undefined' && process.env && process.env.ETHERSCAN_API_KEY) || undefined,
  COINGECKO_API_KEY: (typeof process !== 'undefined' && process.env && process.env.COINGECKO_API_KEY) || undefined,
  ALCHEMY_API_KEY: (typeof process !== 'undefined' && process.env && process.env.ALCHEMY_API_KEY) || undefined
}

export const ENV: EnvShape = {
  ETHERSCAN_API_KEY: pick(ETHERSCAN_API_KEY, extra.ETHERSCAN_API_KEY, PUB.ETHERSCAN_API_KEY, PLAIN.ETHERSCAN_API_KEY),
  COINGECKO_API_KEY: pick(COINGECKO_API_KEY, extra.COINGECKO_API_KEY, PUB.COINGECKO_API_KEY, PLAIN.COINGECKO_API_KEY),
  ALCHEMY_API_KEY: pick(ALCHEMY_API_KEY, extra.ALCHEMY_API_KEY, PUB.ALCHEMY_API_KEY, PLAIN.ALCHEMY_API_KEY)
}
