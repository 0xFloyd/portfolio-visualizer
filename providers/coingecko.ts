import { CHAINS, SupportedNetworkKey } from '../lib/utils'
import { ENV } from '../constants/env'

export const COINGECKO_API_KEY = ENV.COINGECKO_API_KEY
export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

type TokenPriceEntry = {
  usd?: number
  usd_24h_change?: number
  last_updated_at?: number
}
type TokenPriceMap = Record<string, TokenPriceEntry>

export function withKey(url: string) {
  if (!COINGECKO_API_KEY) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}x_cg_demo_api_key=${COINGECKO_API_KEY}`
}

export async function fetchPricesForContracts(
  network: SupportedNetworkKey,
  addresses: string[]
): Promise<TokenPriceMap> {
  if (!addresses.length) return {}
  const platform = CHAINS[network].cgPlatformId
  const qs = new URLSearchParams({
    contract_addresses: addresses.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
    include_last_updated_at: 'true'
  })
  const url = withKey(`${COINGECKO_BASE}/simple/token_price/${platform}?${qs}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  return (await res.json()) as TokenPriceMap
}

export async function fetchSimplePricesByIds(ids: string[]): Promise<Record<string, { usd?: number }>> {
  if (!ids.length) return {}
  const qs = new URLSearchParams({ ids: ids.join(','), vs_currencies: 'usd' })
  const url = withKey(`${COINGECKO_BASE}/simple/price?${qs}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  return (await res.json()) as any
}

export function deriveLargeFrom(input?: string, fallback?: string): string | undefined {
  const repl = (u?: string) => (u ? u.replace('/small/', '/large/').replace('/thumb/', '/large/') : undefined)
  const a = repl(input)
  if (a && a !== input) return a
  const b = repl(fallback)
  return b
}
