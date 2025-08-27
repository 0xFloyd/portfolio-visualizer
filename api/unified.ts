import type { SupportedNetworkKey } from '../providers/ethers'
import type { AlchemyEnrichedHolding, AlchemyEnrichedPortfolio } from '../providers/alchemy'
import { fetchTokensByAddressAlchemyAllNetworks } from '../providers/alchemy'
import { CHAINS } from '../constants/chains'
import {
  COINGECKO_BASE as CG_BASE,
  withKey as cgWithKey,
  fetchPricesForContracts,
  fetchSimplePricesByIds,
  deriveLargeFrom
} from './coingecko'
import { parallelMapWithLimit } from '../lib/utils'

// Unified portfolio fetcher: orchestrates Alchemy (holdings) + CoinGecko (prices/icons)
// Returns the exact trio your store sets: enrichedPortfolio, cgFilteredKeys, cgPlaceholdersUsed

export type FetchPortfolioOptions = {
  // Alchemy Data API toggles
  withAlchemyMetadata?: boolean
  withAlchemyPrices?: boolean
  // CoinGecko contract metadata free-tier budget (requests per minute)
  cgContractMetaRpmBudget?: number
}

export type FetchPortfolioResult = {
  enrichedPortfolio: AlchemyEnrichedPortfolio
  cgFilteredKeys: Set<string>
  cgPlaceholdersUsed: boolean
}

// Internal helper mirrors the enrichment logic currently embedded in store/appStore.ts,
// keeping behavior consistent while allowing this module to be dropped in.
async function enrichAlchemyPortfolioWithCoinGecko(
  portfolio: AlchemyEnrichedPortfolio,
  opts?: { cgContractMetaRpmBudget?: number }
): Promise<{ portfolio: AlchemyEnrichedPortfolio; filtered: Set<string>; placeholdersUsed: boolean }> {
  const out: AlchemyEnrichedPortfolio = {}
  const filtered = new Set<string>()
  let placeholdersUsed = false

  // Simple minute window counter for the free-tier contract metadata endpoint
  const BUDGET = Math.max(0, opts?.cgContractMetaRpmBudget ?? 30)
  let windowStartMs = 0
  let usedInWindow = 0
  const cgTryConsumeOne = () => {
    const now = Date.now()
    if (now - windowStartMs >= 60_000) {
      windowStartMs = now
      usedInWindow = 0
    }
    if (usedInWindow < BUDGET) {
      usedInWindow++
      return true
    }
    return false
  }

  const networks = Object.keys(portfolio) as SupportedNetworkKey[]
  await Promise.all(
    networks.map(async (network) => {
      const list = portfolio[network] ?? []
      if (!list.length) {
        out[network] = []
        return
      }

      const erc20s = list.filter((a) => !a.isNative && a.token?.address)
      const uniq = Array.from(new Set(erc20s.map((a) => a.token!.address!.toLowerCase())))

      // Prices for ERC-20s by contract (to fill any gaps)
      const priceMap = await fetchPricesForContracts(network, uniq).catch(() => ({} as any))

      // Thumbs/ids for ERC-20s (best-effort) with 404 detection -> filtered set
      const thumbs: Record<string, { id?: string; thumb?: string; small?: string }> = {}
      const platform = CHAINS[network].cgPlatformId

      await parallelMapWithLimit(uniq, 3, async (addr) => {
        try {
          if (!cgTryConsumeOne()) {
            placeholdersUsed = true
            thumbs[addr] = {}
            return undefined as unknown as never
          }
          const url = cgWithKey(`${CG_BASE}/coins/${platform}/contract/${addr}`)
          const res = await fetch(url)
          if (res.status === 404) {
            filtered.add(`${network}:${addr}`)
            thumbs[addr] = {}
            return undefined as unknown as never
          }
          if (!res.ok) {
            thumbs[addr] = {}
            return undefined as unknown as never
          }
          const j = (await res.json()) as any
          thumbs[addr] = { id: j?.id, thumb: j?.image?.thumb, small: j?.image?.small }
        } catch {
          thumbs[addr] = {}
        }
        return undefined as unknown as never
      })

      // Native coin price + icon (best-effort)
      let nativePriceUsd: number | undefined
      let nativeThumb: string | undefined
      let nativeSmall: string | undefined
      let nativeLarge: string | undefined
      const hasNative = list.some((a) => a.isNative)
      if (hasNative) {
        const id = CHAINS[network].nativeCgId
        try {
          const p = await fetchSimplePricesByIds([id])
          nativePriceUsd = p?.[id]?.usd
        } catch {}
        try {
          const coin = await fetch(cgWithKey(`${CG_BASE}/coins/${id}`))
          if (coin.ok) {
            const j = (await coin.json()) as any
            nativeThumb = j?.image?.thumb
            nativeSmall = j?.image?.small
            nativeLarge = j?.image?.large || deriveLargeFrom(j?.image?.small, j?.image?.thumb)
          }
        } catch {}
      }

      out[network] = list.map<AlchemyEnrichedHolding>((a) => {
        if (a.isNative) {
          const priceUsd = a.priceUsd ?? nativePriceUsd
          return {
            ...a,
            priceUsd,
            valueUsd: priceUsd ? Number(a.balanceFormatted) * priceUsd : a.valueUsd,
            imageThumb: a.imageThumb || nativeThumb,
            imageSmall: a.imageSmall || nativeSmall,
            imageLarge: a.imageLarge || nativeLarge
          }
        }
        const key = a.token?.address?.toLowerCase?.() || ''
        const p = (priceMap as any)[key]
        const info = thumbs[key]
        const priceUsd: number | undefined = a.priceUsd ?? p?.usd
        const imageLarge = a.imageLarge || deriveLargeFrom(info?.small, info?.thumb)
        return {
          ...a,
          priceUsd,
          price24hChangePct: a.price24hChangePct ?? p?.usd_24h_change,
          valueUsd: priceUsd ? Number(a.balanceFormatted) * priceUsd : a.valueUsd,
          imageThumb: a.imageThumb || info?.thumb,
          imageSmall: a.imageSmall || info?.small,
          imageLarge
        }
      })
    })
  )

  return { portfolio: out, filtered, placeholdersUsed }
}

export async function fetchPortfolio(address: string, options?: FetchPortfolioOptions): Promise<FetchPortfolioResult> {
  if (!address) {
    return { enrichedPortfolio: {}, cgFilteredKeys: new Set(), cgPlaceholdersUsed: false }
  }

  // 1) Fetch holdings via Alchemy Data API across supported networks
  const withMetadata = options?.withAlchemyMetadata ?? true
  const withPrices = options?.withAlchemyPrices ?? true
  const alchemy = await fetchTokensByAddressAlchemyAllNetworks(address, { withMetadata, withPrices })

  // 2) Enrich with CoinGecko prices + icons, tracking filtered keys and placeholder usage
  const { portfolio, filtered, placeholdersUsed } = await enrichAlchemyPortfolioWithCoinGecko(alchemy, {
    cgContractMetaRpmBudget: options?.cgContractMetaRpmBudget ?? 30
  })

  // 3) Return in the exact shape your store expects
  return {
    enrichedPortfolio: portfolio,
    cgFilteredKeys: filtered,
    cgPlaceholdersUsed: placeholdersUsed
  }
}
