import type { SupportedNetworkKey } from '../providers/ethers'
import { CHAINS } from '../constants/chains'
// import { createRateLimiter, retryWithBackoff, sleep, parallelMapWithLimit } from '../lib/utils'
import { ENV } from '../constants/env'

// CoinGecko API key (from env / Expo extra)
export const COINGECKO_API_KEY = ENV.COINGECKO_API_KEY

function _mask(v?: string) {
  if (!v) return '(empty)'
  const s = String(v)
  if (s.length <= 8) return `${s.slice(0, 2)}…(${s.length})`
  return `${s.slice(0, 4)}…(${s.length})`
}

try {
  // eslint-disable-next-line no-console
  console.log('[coingecko] COINGECKO_API_KEY (masked):', _mask(COINGECKO_API_KEY))
} catch {}

// Public/Demo base; the demo key is passed as a query param per docs.
// Change under TODO step: Centralize CoinGecko helpers (items 2 & 10)
export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// Use CHAINS to resolve platform/native ids instead of local maps

type TokenPriceEntry = {
  usd?: number
  usd_24h_change?: number
  last_updated_at?: number
}
type TokenPriceMap = Record<string, TokenPriceEntry>

type TokenInfoResponse = {
  id?: string
  image?: { thumb?: string; small?: string; large?: string }
  symbol?: string
  name?: string
}

export function withKey(url: string) {
  // Demo/free keys are supplied as a query param on api.coingecko.com
  if (!COINGECKO_API_KEY) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}x_cg_demo_api_key=${COINGECKO_API_KEY}`
}

// ---- throttling + retries (disabled for debugging) ----
/*
const CG_MAX_CONCURRENT = 4
const CG_MIN_SPACING_MS = 80
const CG_RETRY_ATTEMPTS = 4
const CG_RETRY_BASE_DELAY_MS = 200
const CG_RETRY_MAX_DELAY_MS = 3000

const cgLimiter = createRateLimiter(CG_MAX_CONCURRENT, CG_MIN_SPACING_MS)

function isCgRateLimit(e: any): boolean {
  const status = e?.status ?? e?.response?.status
  if (status === 429) return true
  const msg = e?.message || e?.toString?.() || ''
  return typeof msg === 'string' && /too many requests|rate limit/i.test(msg)
}

async function withCgRetry<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(() => cgLimiter.schedule(fn), {
    attempts: CG_RETRY_ATTEMPTS,
    baseDelayMs: CG_RETRY_BASE_DELAY_MS,
    maxDelayMs: CG_RETRY_MAX_DELAY_MS,
    jitterRatio: 0.3,
    isRetryable: (e) => isCgRateLimit(e)
  })
}
*/

// ---- low-level fetchers ----
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

// fetchTokenThumb removed (unused after unified_simple path)

export async function fetchSimplePricesByIds(ids: string[]): Promise<Record<string, { usd?: number }>> {
  if (!ids.length) return {}
  const qs = new URLSearchParams({ ids: ids.join(','), vs_currencies: 'usd' })
  const url = withKey(`${COINGECKO_BASE}/simple/price?${qs}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  return (await res.json()) as any
}

// ---- enrichment types + main function ----
// enrichPortfolioWithCoinGecko removed (unused after unified_simple path)

// ---- small helpers (exported for reuse across store/UI) ----
export function deriveLargeFrom(input?: string, fallback?: string): string | undefined {
  const repl = (u?: string) => (u ? u.replace('/small/', '/large/').replace('/thumb/', '/large/') : undefined)
  const a = repl(input)
  if (a && a !== input) return a
  const b = repl(fallback)
  return b
}
