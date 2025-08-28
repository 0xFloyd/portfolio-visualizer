import { fetchTokensByAddressAlchemyAllNetworks, type AlchemyEnrichedPortfolio } from '../providers/alchemy'
import { CHAINS, NETWORK_KEYS } from '../constants/chains'
import type { SupportedNetworkKey } from '../providers/ethers'
import {
  COINGECKO_BASE as CG_BASE,
  withKey as cgWithKey,
  fetchPricesForContracts,
  fetchSimplePricesByIds,
  deriveLargeFrom
} from './coingecko'
import { parallelMapWithLimit } from '../lib/utils'

export type FetchPortfolioResult = {
  enrichedPortfolio: AlchemyEnrichedPortfolio
  cgFilteredKeys: Set<string>
  cgPlaceholdersUsed: boolean
}

// Minimal, Snack-safe enrichment: Alchemy for balances, CoinGecko for icons/prices best-effort.
export async function fetchPortfolio(address: string): Promise<FetchPortfolioResult> {
  if (!address) {
    return { enrichedPortfolio: {}, cgFilteredKeys: new Set(), cgPlaceholdersUsed: false }
  }

  // 1) Fetch holdings across networks via Alchemy Data API (already Snack-safe)
  const alchemy = await fetchTokensByAddressAlchemyAllNetworks(address, { withMetadata: true, withPrices: true })

  // 2) Best-effort light enrichment mirroring current UI needs
  const out: AlchemyEnrichedPortfolio = {}
  const filtered = new Set<string>()
  let placeholdersUsed = false

  const networks = NETWORK_KEYS as SupportedNetworkKey[]
  await Promise.all(
    networks.map(async (network) => {
      const list = alchemy[network] ?? []
      if (!list.length) {
        out[network] = []
        return
      }

      const erc20s = list.filter((a) => !a.isNative && a.token?.address)
      const uniq = Array.from(new Set(erc20s.map((a) => a.token!.address!.toLowerCase())))

      // ERC-20 prices (fills gaps if Alchemy price missing)
      const priceMap = await fetchPricesForContracts(network, uniq).catch(() => ({} as any))

      // ERC-20 thumbs/id (best-effort, throttle a bit to be Snack-friendly)
      const thumbs: Record<string, { id?: string; thumb?: string; small?: string }> = {}
      const platform = CHAINS[network].cgPlatformId

      // Allow up to 30 per minute; here we just sequentially cap concurrency to 3
      await parallelMapWithLimit(uniq, 3, async (addr) => {
        try {
          const url = cgWithKey(`${CG_BASE}/coins/${platform}/contract/${addr}`)
          const res = await fetch(url)
          if (res.status === 404) {
            filtered.add(`${network}:${addr}`)
            thumbs[addr] = {}
            return undefined as unknown as never
          }
          if (!res.ok) {
            placeholdersUsed = true
            thumbs[addr] = {}
            return undefined as unknown as never
          }
          const j = (await res.json()) as any
          thumbs[addr] = { id: j?.id, thumb: j?.image?.thumb, small: j?.image?.small }
        } catch {
          placeholdersUsed = true
          thumbs[addr] = {}
        }
        return undefined as unknown as never
      })

      // Native price + icon (best-effort)
      let nativePriceUsd: number | undefined
      let nativeThumb: string | undefined
      let nativeSmall: string | undefined
      let nativeLarge: string | undefined
      if (list.some((a) => a.isNative)) {
        try {
          const id = CHAINS[network].nativeCgId
          const p = await fetchSimplePricesByIds([id])
          nativePriceUsd = p?.[id]?.usd
          const coin = await fetch(cgWithKey(`${CG_BASE}/coins/${id}`))
          if (coin.ok) {
            const cj = (await coin.json()) as any
            nativeThumb = cj?.image?.thumb
            nativeSmall = cj?.image?.small
            nativeLarge = cj?.image?.large || deriveLargeFrom(cj?.image?.small, cj?.image?.thumb)
          }
        } catch {}
      }

      out[network] = list.map((a) => {
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

  return { enrichedPortfolio: out, cgFilteredKeys: filtered, cgPlaceholdersUsed: placeholdersUsed }
}
