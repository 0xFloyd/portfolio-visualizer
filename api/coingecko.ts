import type { AssetHolding, SupportedNetworkKey } from '../providers/ethers'
// import { createRateLimiter, retryWithBackoff, sleep, parallelMapWithLimit } from '../lib/utils'
import { parallelMapWithLimit } from '../lib/utils'
import { ENV } from '@/constants/env'

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
const BASE = 'https://api.coingecko.com/api/v3'

// Map our networks -> CoinGecko "asset platform" slugs
const PLATFORM_ID: Record<SupportedNetworkKey, string> = {
  mainnet: 'ethereum',
  polygon: 'polygon-pos',
  optimism: 'optimistic-ethereum',
  arbitrum: 'arbitrum-one',
  base: 'base'
}

// Native coin IDs (for /simple/price). OP/ARB use ETH as native gas.
const NATIVE_COIN_ID: Record<SupportedNetworkKey, string> = {
  mainnet: 'ethereum', // ETH
  polygon: 'matic-network', // MATIC
  optimism: 'ethereum', // ETH on OP
  arbitrum: 'ethereum', // ETH on ARB
  base: 'ethereum' // ETH on Base
}

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

function withKey(url: string) {
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
  const platform = PLATFORM_ID[network]
  const qs = new URLSearchParams({
    contract_addresses: addresses.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
    include_last_updated_at: 'true'
  })
  const url = withKey(`${BASE}/simple/token_price/${platform}?${qs}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  return (await res.json()) as TokenPriceMap
}

export async function fetchTokenThumb(
  network: SupportedNetworkKey,
  address: string
): Promise<{ id?: string; thumb?: string; small?: string }> {
  const platform = PLATFORM_ID[network]
  const url = withKey(`${BASE}/coins/${platform}/contract/${address}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  const j = (await res.json()) as TokenInfoResponse
  return { id: j?.id, thumb: j?.image?.thumb, small: j?.image?.small }
}

export async function fetchSimplePricesByIds(ids: string[]): Promise<Record<string, { usd?: number }>> {
  if (!ids.length) return {}
  const qs = new URLSearchParams({ ids: ids.join(','), vs_currencies: 'usd' })
  const url = withKey(`${BASE}/simple/price?${qs}`)
  const res = await fetch(url)
  if (!res.ok) return {}
  return (await res.json()) as any
}

// ---- enrichment types + main function ----
export type EnrichedHolding = AssetHolding & {
  priceUsd?: number
  valueUsd?: number
  imageThumb?: string
  imageSmall?: string
  imageLarge?: string
  cgId?: string
  price24hChangePct?: number
}

export type EnrichedPortfolio = Partial<Record<SupportedNetworkKey, EnrichedHolding[]>>

export async function enrichPortfolioWithCoinGecko(
  portfolio: Partial<Record<SupportedNetworkKey, AssetHolding[]>>
): Promise<EnrichedPortfolio> {
  const out: EnrichedPortfolio = {}

  function deriveLargeFrom(input?: string, fallback?: string): string | undefined {
    const repl = (u?: string) => (u ? u.replace('/small/', '/large/').replace('/thumb/', '/large/') : undefined)
    const a = repl(input)
    if (a && a !== input) return a
    const b = repl(fallback)
    return b
  }

  await Promise.all(
    (Object.keys(portfolio) as SupportedNetworkKey[]).map(async (network) => {
      const list = portfolio[network] ?? []
      if (!list.length) {
        out[network] = []
        return
      }

      const erc20s = list.filter((a) => !a.isNative && a.token?.address)
      const uniq = Array.from(new Set(erc20s.map((a) => a.token!.address.toLowerCase())))

      // 1) prices for ERC-20s by contract (batch per network)
      const priceMap = await fetchPricesForContracts(network, uniq)

      // 2) thumbs/ids for ERC-20s (one-by-one; only for present tokens)
      const thumbs: Record<string, { id?: string; thumb?: string; small?: string }> = {}
      await parallelMapWithLimit(uniq, 3, async (addr) => {
        thumbs[addr] = await fetchTokenThumb(network, addr).catch(() => ({}))
        return undefined as unknown as never
      })

      // 3) native coin (ETH or MATIC) price + icon
      let nativePriceUsd: number | undefined
      let nativeThumb: string | undefined
      let nativeSmall: string | undefined
      let nativeLarge: string | undefined
      const native = list.find((a) => a.isNative)
      if (native) {
        const id = NATIVE_COIN_ID[network]
        const p = await fetchSimplePricesByIds([id])
        nativePriceUsd = p?.[id]?.usd
        // fetch coin page once for the icon (best-effort)
        try {
          const coin = await fetch(withKey(`${BASE}/coins/${id}`))
          if (coin.ok) {
            const j = (await coin.json()) as TokenInfoResponse
            nativeThumb = j?.image?.thumb
            nativeSmall = j?.image?.small
            nativeLarge = j?.image?.large || deriveLargeFrom(j?.image?.small, j?.image?.thumb)
          }
        } catch {}
      }

      out[network] = list.map<EnrichedHolding>((a) => {
        if (a.isNative) {
          const priceUsd = nativePriceUsd
          return {
            ...a,
            priceUsd,
            valueUsd: priceUsd ? Number(a.balanceFormatted) * priceUsd : undefined,
            imageThumb: nativeThumb,
            imageSmall: nativeSmall,
            imageLarge: nativeLarge,
            cgId: NATIVE_COIN_ID[network]
          }
        }
        const key = a.token!.address.toLowerCase()
        const p = priceMap[key]
        const info = thumbs[key]
        const priceUsd = p?.usd
        const imageLarge = deriveLargeFrom(info?.small, info?.thumb)
        return {
          ...a,
          priceUsd,
          price24hChangePct: p?.usd_24h_change,
          valueUsd: priceUsd ? Number(a.balanceFormatted) * priceUsd : undefined,
          imageThumb: info?.thumb,
          imageSmall: info?.small,
          imageLarge,
          cgId: info?.id
        }
      })
    })
  )

  return out
}
