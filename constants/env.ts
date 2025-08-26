import Constants from 'expo-constants'

type EnvShape = {
  INFURA_API_KEY: string
  ETHERSCAN_API_KEY: string
  COINGECKO_API_KEY: string
  ALCHEMY_API_KEY: string
}

function pick(...vals: Array<string | undefined | null>): string {
  for (const v of vals) if (typeof v === 'string' && v.length > 0) return v
  return ''
}

function mask(v?: string): string {
  if (!v) return '(empty)'
  const s = String(v)
  if (s.length <= 8) return `${s.slice(0, 2)}…(${s.length})`
  return `${s.slice(0, 4)}…(${s.length})`
}

// Read from Expo config extras first (works on native and web when using app.config.ts)
const extra: any = (Constants as any)?.expoConfig?.extra || (Constants as any)?.manifest?.extra || {}

// Read EXPO_PUBLIC_* statically for web bundler replacement
declare const process: any
const PUB = {
  INFURA_API_KEY: (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_INFURA_API_KEY) || undefined,
  ETHERSCAN_API_KEY: (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY) || undefined,
  COINGECKO_API_KEY: (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_COINGECKO_API_KEY) || undefined,
  ALCHEMY_API_KEY: (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) || undefined,
}

// Also try plain env names (useful in Node contexts)
const PLAIN = {
  INFURA_API_KEY: (typeof process !== 'undefined' && process.env && process.env.INFURA_API_KEY) || undefined,
  ETHERSCAN_API_KEY: (typeof process !== 'undefined' && process.env && process.env.ETHERSCAN_API_KEY) || undefined,
  COINGECKO_API_KEY: (typeof process !== 'undefined' && process.env && process.env.COINGECKO_API_KEY) || undefined,
  ALCHEMY_API_KEY: (typeof process !== 'undefined' && process.env && process.env.ALCHEMY_API_KEY) || undefined,
}

export const ENV: EnvShape = {
  INFURA_API_KEY: pick(extra.INFURA_API_KEY, PUB.INFURA_API_KEY, PLAIN.INFURA_API_KEY),
  ETHERSCAN_API_KEY: pick(extra.ETHERSCAN_API_KEY, PUB.ETHERSCAN_API_KEY, PLAIN.ETHERSCAN_API_KEY),
  COINGECKO_API_KEY: pick(extra.COINGECKO_API_KEY, PUB.COINGECKO_API_KEY, PLAIN.COINGECKO_API_KEY),
  ALCHEMY_API_KEY: pick(extra.ALCHEMY_API_KEY, PUB.ALCHEMY_API_KEY, PLAIN.ALCHEMY_API_KEY),
}

// Dev-time logging to help verify which layer supplied values (masked)
if (typeof console !== 'undefined') {
  // Use a small delay to avoid noisy logs on repeated imports
  try {
    const layer = {
      extra: {
        INFURA_API_KEY: mask(extra.INFURA_API_KEY),
        ETHERSCAN_API_KEY: mask(extra.ETHERSCAN_API_KEY),
        COINGECKO_API_KEY: mask(extra.COINGECKO_API_KEY),
        ALCHEMY_API_KEY: mask(extra.ALCHEMY_API_KEY),
      },
      EXPO_PUBLIC: {
        INFURA_API_KEY: mask(PUB.INFURA_API_KEY),
        ETHERSCAN_API_KEY: mask(PUB.ETHERSCAN_API_KEY),
        COINGECKO_API_KEY: mask(PUB.COINGECKO_API_KEY),
        ALCHEMY_API_KEY: mask(PUB.ALCHEMY_API_KEY),
      },
      plain: {
        INFURA_API_KEY: mask(PLAIN.INFURA_API_KEY),
        ETHERSCAN_API_KEY: mask(PLAIN.ETHERSCAN_API_KEY),
        COINGECKO_API_KEY: mask(PLAIN.COINGECKO_API_KEY),
        ALCHEMY_API_KEY: mask(PLAIN.ALCHEMY_API_KEY),
      },
      chosen: {
        INFURA_API_KEY: mask(ENV.INFURA_API_KEY),
        ETHERSCAN_API_KEY: mask(ENV.ETHERSCAN_API_KEY),
        COINGECKO_API_KEY: mask(ENV.COINGECKO_API_KEY),
        ALCHEMY_API_KEY: mask(ENV.ALCHEMY_API_KEY),
      },
    }
    // eslint-disable-next-line no-console
    console.log('[env] resolved keys:', layer)
  } catch {}
}

