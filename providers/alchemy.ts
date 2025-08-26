import { parallelMapWithLimit } from '../lib/utils'
import type { SupportedNetworkKey } from './ethers'
import { formatWithDecimals } from './ethers'
import { ethers } from 'ethers'
import { ENV } from '@/constants/env'

// Alchemy API key (provided via Expo extra/env)
export const ALCHEMY_API_KEY = ENV.ALCHEMY_API_KEY

function _mask(v?: string) {
  if (!v) return '(empty)'
  const s = String(v)
  if (s.length <= 8) return `${s.slice(0, 2)}…(${s.length})`
  return `${s.slice(0, 4)}…(${s.length})`
}

try {
  // eslint-disable-next-line no-console
  console.log('[alchemy] ALCHEMY_API_KEY (masked):', _mask(ALCHEMY_API_KEY))
} catch {}
console.log('ALCHEMY_API_KEY', ALCHEMY_API_KEY)

// Map our networks to Alchemy chain slugs used by Data/Portfolio APIs
const ALCHEMY_CHAIN_SLUGS: Record<SupportedNetworkKey, string[]> = {
  mainnet: ['eth-mainnet'],
  polygon: ['polygon-mainnet', 'matic-mainnet'],
  // Per docs: 'opt-mainnet' is the canonical slug; keep others as fallbacks
  optimism: ['opt-mainnet'], // 'optimism-mainnet', 'op-mainnet'
  // Canonical: 'arb-mainnet'; keep alias as fallback
  arbitrum: ['arb-mainnet'], // 'arbitrum-mainnet'
  base: ['base-mainnet']
}

// Native token decimals for formatting
const NATIVE_DECIMALS: Record<SupportedNetworkKey, number> = {
  mainnet: 18,
  polygon: 18,
  optimism: 18,
  arbitrum: 18,
  base: 18
}

// Prefer Alchemy RPC for writes; fall back to undefined if no key
export function getAlchemyRpcUrl(network: SupportedNetworkKey): string | undefined {
  if (!ALCHEMY_API_KEY) return undefined
  const byNet: Record<SupportedNetworkKey, string> = {
    mainnet: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  }
  return byNet[network]
}

export function getAlchemyProvider(network: SupportedNetworkKey): ethers.JsonRpcProvider | undefined {
  const url = getAlchemyRpcUrl(network)
  if (!url) return undefined
  const chainId: Record<SupportedNetworkKey, number> = {
    mainnet: 1,
    polygon: 137,
    optimism: 10,
    arbitrum: 42161,
    base: 8453
  }
  return new ethers.JsonRpcProvider(url, chainId[network], { staticNetwork: true })
}

// Enriched holding shape aligned with PortfolioCoinGecko UI
export type AlchemyEnrichedHolding = {
  id: string
  network: SupportedNetworkKey
  isNative: boolean
  token?: {
    address?: string
    symbol?: string
    name?: string
    decimals?: number
    logoURI?: string
  }
  balanceRaw: bigint
  balanceFormatted: string
  priceUsd?: number
  valueUsd?: number
  price24hChangePct?: number
  imageThumb?: string
  imageSmall?: string
  imageLarge?: string
}

export type AlchemyEnrichedPortfolio = Partial<Record<SupportedNetworkKey, AlchemyEnrichedHolding[]>>

// Alchemy Data API (Portfolio endpoints) base.
// Docs: POST https://api.g.alchemy.com/data/v1/:apiKey/assets/tokens/by-address
const DATA_BASE = 'https://api.g.alchemy.com/data/v1'

type FetchOpts = {
  withMetadata?: boolean
  withPrices?: boolean
}

export async function fetchTokensByAddressAlchemy(
  address: string,
  network: SupportedNetworkKey,
  opts: FetchOpts = {}
): Promise<AlchemyEnrichedHolding[]> {
  const withMetadata = opts.withMetadata !== false
  const withPrices = opts.withPrices !== false
  const chainCandidates = ALCHEMY_CHAIN_SLUGS[network]

  if (!address) return []

  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }
  // For Data API, key commonly goes in the path. We'll try path-first; if no key, fall back to header variant.
  if (ALCHEMY_API_KEY) headers['X-API-Key'] = ALCHEMY_API_KEY
  try {
    // eslint-disable-next-line no-console
    console.log('[alchemy] request headers (masked):', {
      'X-API-Key': _mask(headers['X-API-Key'])
    })
  } catch {}

  const out: AlchemyEnrichedHolding[] = []

  for (const chain of chainCandidates) {
    let pageKey: string | undefined
    let haveAny = false
    do {
      const requestBody: any = {
        addresses: [
          {
            address,
            networks: [chain]
          }
        ],
        withMetadata,
        withPrices
      }

      // Build path-with-key route; if no key in code, try header variant.
      const withKeyUrl = ALCHEMY_API_KEY ? `${DATA_BASE}/${ALCHEMY_API_KEY}/assets/tokens/by-address` : ''
      const headerUrl = `${DATA_BASE}/assets/tokens/by-address`

      let res: Response | null = null
      // Attempt path-with-key first when available
      if (withKeyUrl) {
        const attempt = await fetch(withKeyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(pageKey ? { ...requestBody, pageKey } : requestBody)
        })
        if (attempt.status !== 404) res = attempt
      }
      // If still null or 404, attempt header-key variant
      if (!res) {
        const attempt = await fetch(headerUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(pageKey ? { ...requestBody, pageKey } : requestBody)
        })
        res = attempt
      }
      if (!res || !res.ok) {
        try {
          // eslint-disable-next-line no-console
          console.log('[alchemy] response status:', res && res.status)
        } catch {}
        // Try next chain alias (e.g., wrong slug -> 400 Unsupported network)
        pageKey = undefined
        break
      }
      const j = (await res.json()) as any

      const { tokens, nativeEntry, nextPageKey } = extractTokensForSingleNetwork(j, chain)
      const seenNative = !!nativeEntry

      if (nativeEntry) {
        try {
          const formatted = formatWithDecimals(nativeEntry.raw, NATIVE_DECIMALS[network])
          out.push({
            id: `${network}:NATIVE`,
            network,
            isNative: true,
            token: undefined,
            balanceRaw: nativeEntry.raw,
            balanceFormatted: formatted,
            priceUsd: nativeEntry.price,
            valueUsd: nativeEntry.price ? Number(formatted) * nativeEntry.price : undefined,
            imageThumb: nativeEntry.logo,
            imageSmall: nativeEntry.logo,
            imageLarge: nativeEntry.logo
          })
          haveAny = true
        } catch {}
      }

      for (const t of tokens) {
        try {
          const isNative = coerceIsNative(t)
          // Data API normalized fields
          const contract = (t?.tokenAddress || t?.contractAddress || '').toString()
          const balanceStr = (t?.tokenBalance || t?.balance || t?.quantity || '0').toString()
          const decimals = coerceDecimals(t)
          const md = t?.tokenMetadata || t?.metadata || t?.token || {}
          const symbol = md?.symbol || t?.symbol
          const name = md?.name || t?.name
          const logo = md?.logo || t?.logo || t?.icon || t?.logoURI
          const price = coercePriceUsd(t)
          const change24h = coerceChange24hPct(t)

          const raw = toBigIntFromHexOrDec(balanceStr || '0')
          if (raw <= 0n) continue

          const decimalsToUse = isNative ? NATIVE_DECIMALS[network] : decimals
          const formatted = typeof decimalsToUse === 'number' ? formatWithDecimals(raw, decimalsToUse) : raw.toString()

          if (isNative) {
            // If the response already exposed native separately, skip duplicate
            if (seenNative) continue
          }

          out.push({
            id: isNative
              ? `${network}:NATIVE`
              : `${network}:${contract || name || symbol || Math.random().toString(36).slice(2)}`,
            network,
            isNative,
            token: isNative
              ? undefined
              : {
                  address: contract || undefined,
                  symbol,
                  name,
                  decimals: typeof decimals === 'number' ? decimals : undefined,
                  logoURI: logo
                },
            balanceRaw: raw,
            balanceFormatted: formatted,
            priceUsd: price,
            price24hChangePct: change24h,
            valueUsd: price ? Number(formatted) * price : undefined,
            imageThumb: logo,
            imageSmall: logo,
            imageLarge: logo
          })
          haveAny = true
        } catch {
          // Skip malformed entries
        }
      }

      pageKey = typeof nextPageKey === 'string' ? nextPageKey : typeof j?.pageKey === 'string' ? j.pageKey : undefined
    } while (pageKey)

    // If we successfully got any assets for a candidate slug, stop trying others
    if (haveAny) break
  }

  return out
}

export async function fetchTokensByAddressAlchemyAllNetworks(
  address: string,
  opts: FetchOpts = {}
): Promise<AlchemyEnrichedPortfolio> {
  const networks = Object.keys(ALCHEMY_CHAIN_SLUGS) as SupportedNetworkKey[]
  const results = await parallelMapWithLimit(networks, 2, async (n) => {
    try {
      const list = await fetchTokensByAddressAlchemy(address, n, opts)
      return [n, list] as const
    } catch {
      return [n, []] as const
    }
  })
  return Object.fromEntries(results) as AlchemyEnrichedPortfolio
}

function coerceDecimals(t: any): number | undefined {
  const d = t?.decimals ?? t?.token?.decimals ?? t?.metadata?.decimals ?? t?.tokenMetadata?.decimals
  const n = typeof d === 'string' ? Number(d) : d
  return typeof n === 'number' && isFinite(n) ? n : undefined
}

function coerceIsNative(t: any): boolean {
  if (t?.isNative === true) return true
  if (t?.tokenAddress == null) return true // Data API uses null for native
  if (typeof t?.type === 'string' && /native/i.test(t.type)) return true
  if (typeof t?.standard === 'string' && /native/i.test(t.standard)) return true
  return false
}

function coercePriceUsd(t: any): number | undefined {
  // First, check tokenPrices array per Data API
  const tp = t?.tokenPrices
  if (Array.isArray(tp)) {
    const usd = tp.find((p: any) => (p?.currency || '').toLowerCase() === 'usd')
    if (usd) {
      const val = typeof usd.value === 'string' ? Number(usd.value) : usd.value
      if (typeof val === 'number' && isFinite(val)) return val
    }
  }
  const candidates = [
    t?.price?.latestUSDPrice,
    t?.price?.usd,
    t?.prices?.latest?.value,
    t?.quote?.usd,
    t?.usdPrice,
    t?.priceUsd
  ]
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c
    if (typeof n === 'number' && isFinite(n)) return n
  }
  return undefined
}

function coerceChange24hPct(t: any): number | undefined {
  const candidates = [t?.price?.percentChange24h, t?.priceChange24hPct, t?.usd_24h_change]
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c
    if (typeof n === 'number' && isFinite(n)) return n
  }
  return undefined
}

// Attempts to extract a flat list of token-like entries and an optional native balance entry
// from the Data API response for a single network slug.
function extractTokensForSingleNetwork(
  j: any,
  chain: string
): {
  tokens: any[]
  nativeEntry?: { raw: bigint; price?: number; logo?: string }
  nextPageKey?: string
} {
  let tokens: any[] = Array.isArray(j?.tokens) ? j.tokens : []
  if (!tokens.length && Array.isArray(j?.data?.tokens)) tokens = j.data.tokens
  if (!tokens.length && Array.isArray(j?.addresses)) {
    const col: any[] = []
    for (const a of j.addresses) {
      if (Array.isArray(a?.tokens)) col.push(...a.tokens)
      if (Array.isArray(a?.assets)) col.push(...a.assets)
    }
    tokens = col
  }
  // We call per-network; accept all tokens in this response without filtering by returned slug
  const native = j?.nativeBalance || null
  let nativeEntry: { raw: bigint; price?: number; logo?: string } | undefined
  if (native && typeof native?.balance === 'string') {
    try {
      nativeEntry = { raw: toBigIntFromHexOrDec(native.balance), price: coercePriceUsd(native), logo: native?.logo }
    } catch {}
  }
  const nextPageKey = typeof j?.pageKey === 'string' ? j.pageKey : undefined
  return { tokens, nativeEntry, nextPageKey }
}

function toBigIntFromHexOrDec(v: string): bigint {
  if (typeof v !== 'string') return 0n
  const s = v.trim()
  if (/^0x/i.test(s)) return BigInt(s)
  return BigInt(s)
}
