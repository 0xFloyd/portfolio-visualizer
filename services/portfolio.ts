import { fetchTokensByAddressAlchemyAllNetworks, type AlchemyEnrichedPortfolio } from '../providers/alchemy-data'
import { CHAINS, NETWORK_KEYS, SupportedNetworkKey } from '../lib/utils'
import {
  COINGECKO_BASE as CG_BASE,
  withKey as cgWithKey,
  fetchPricesForContracts,
  fetchSimplePricesByIds,
  deriveLargeFrom
} from '../providers/coingecko'
import { parallelMapWithLimit } from '../lib/utils'

export type FetchPortfolioResult = {
  enrichedPortfolio: AlchemyEnrichedPortfolio
  cgFilteredKeys: Set<string>
  cgPlaceholdersUsed: boolean
}

export async function fetchPortfolio(address: string): Promise<FetchPortfolioResult> {
  if (!address) {
    return { enrichedPortfolio: {}, cgFilteredKeys: new Set(), cgPlaceholdersUsed: false }
  }

  const alchemy = await fetchTokensByAddressAlchemyAllNetworks(address, { withMetadata: true, withPrices: true })

  const out: AlchemyEnrichedPortfolio = {}
  const filtered = new Set<string>()
  let placeholdersUsed = false

  // Select up to 30 highest-value ERC-20s across all networks that are missing icons.
  // Only consider tokens with portfolio value > $1 (using Alchemy price/value when present).
  const networks = NETWORK_KEYS as SupportedNetworkKey[]
  const globalCandidateMap = new Map<string, { network: SupportedNetworkKey; address: string; valueUsd: number }>()
  for (const network of networks) {
    const list = alchemy[network] ?? []
    for (const a of list) {
      try {
        if (a.isNative) continue
        const addr = a.token?.address?.toLowerCase?.()
        if (!addr) continue
        const hasIcon = !!(a.imageLarge || a.imageSmall || a.imageThumb || a.token?.logoURI)
        if (hasIcon) continue
        const price = typeof a.priceUsd === 'number' && isFinite(a.priceUsd) ? a.priceUsd : undefined
        const balNum = typeof a.balanceFormatted === 'string' ? Number(a.balanceFormatted) : (a.balanceFormatted as any)
        const balance = typeof balNum === 'number' && isFinite(balNum) ? balNum : 0
        const val = typeof a.valueUsd === 'number' && isFinite(a.valueUsd) ? a.valueUsd : price ? balance * price : 0
        if (!(val > 1)) continue
        const key = `${network}:${addr}`
        const prev = globalCandidateMap.get(key)
        if (!prev || prev.valueUsd < val) {
          globalCandidateMap.set(key, { network, address: addr, valueUsd: val })
        }
      } catch {}
    }
  }
  const globalTop = Array.from(globalCandidateMap.values())
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 30)
  const allowedLookup = new Set(globalTop.map((t) => `${t.network}:${t.address}`))
  if (globalCandidateMap.size > allowedLookup.size) {
    placeholdersUsed = true
  }

  await Promise.all(
    networks.map(async (network) => {
      const list = alchemy[network] ?? []
      if (!list.length) {
        out[network] = []
        return
      }

      const erc20s = list.filter((a) => !a.isNative && a.token?.address)
      const uniq = Array.from(new Set(erc20s.map((a) => a.token!.address!.toLowerCase())))

      const priceMap = await fetchPricesForContracts(network, uniq).catch(() => ({} as any))

      const thumbs: Record<string, { id?: string; thumb?: string; small?: string }> = {}
      const platform = CHAINS[network].cgPlatformId

      // only get coingecko tokens for top 30 tokens due to free tier limitation
      const missing = erc20s
        .filter((a) => !(a.imageLarge || a.imageSmall || a.imageThumb || a.token?.logoURI))
        .map((a) => a.token!.address!.toLowerCase())
      const uniqMissing = Array.from(new Set(missing))
      const toLookup = uniqMissing.filter((addr) => allowedLookup.has(`${network}:${addr}`))
      if (uniqMissing.length > toLookup.length) placeholdersUsed = true

      //  avoid 429s
      await parallelMapWithLimit(toLookup, 3, async (addr) => {
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
