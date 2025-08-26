import { createStore } from './createStore'
import type { AssetHolding, SupportedNetworkKey, TxSummary } from '../providers/ethers'
import type { AlchemyEnrichedPortfolio, AlchemyEnrichedHolding } from '../providers/alchemy'
import { fetchTokensByAddressAlchemyAllNetworks } from '../providers/alchemy'
import { fetchPricesForContracts, fetchSimplePricesByIds } from '../api/coingecko'
import { ENV } from '@/constants/env'
import { parallelMapWithLimit } from '../lib/utils'
import type { Wallet, HDNodeWallet } from 'ethers'

// ---- CoinGecko helpers used for enrichment in the store ----
function deriveLargeFrom(input?: string, fallback?: string): string | undefined {
  const replaceToLarge = (u?: string) => (u ? u.replace('/small/', '/large/').replace('/thumb/', '/large/') : undefined)
  const a = replaceToLarge(input)
  if (a && a !== input) return a
  const b = replaceToLarge(fallback)
  return b
}

const CG_BASE = 'https://api.coingecko.com/api/v3'
function cgWithKey(url: string): string {
  const key = ENV.COINGECKO_API_KEY
  if (!key) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}x_cg_demo_api_key=${key}`
}

const CG_NATIVE_ID: Record<SupportedNetworkKey, string> = {
  mainnet: 'ethereum',
  polygon: 'matic-network',
  optimism: 'ethereum',
  arbitrum: 'ethereum',
  base: 'ethereum'
}

const CG_PLATFORM_ID: Record<SupportedNetworkKey, string> = {
  mainnet: 'ethereum',
  polygon: 'polygon-pos',
  optimism: 'optimistic-ethereum',
  arbitrum: 'arbitrum-one',
  base: 'base'
}

// Free-tier contract metadata budget (requests/minute)
const CG_CONTRACT_META_RPM_BUDGET = 30
let cgWindowStartMs = 0
let cgCallsThisWindow = 0

function cgTryConsumeOne(): boolean {
  const now = Date.now()
  if (now - cgWindowStartMs >= 60_000) {
    cgWindowStartMs = now
    cgCallsThisWindow = 0
  }
  if (cgCallsThisWindow < CG_CONTRACT_META_RPM_BUDGET) {
    cgCallsThisWindow++
    return true
  }
  return false
}

async function enrichAlchemyPortfolioWithCoinGecko(
  portfolio: AlchemyEnrichedPortfolio
): Promise<{ portfolio: AlchemyEnrichedPortfolio; filtered: Set<string>; placeholdersUsed: boolean }> {
  const out: AlchemyEnrichedPortfolio = {}
  const filtered = new Set<string>()
  let placeholdersUsed = false

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

      // Prices for ERC-20s by contract (to fill gaps only)
      const priceMap = await fetchPricesForContracts(network, uniq).catch(() => ({} as any))

      // Thumbs/ids for ERC-20s (best-effort) with 404 detection
      const thumbs: Record<string, { id?: string; thumb?: string; small?: string }> = {}
      const platform = CG_PLATFORM_ID[network]

      await parallelMapWithLimit(uniq, 3, async (addr) => {
        try {
          // obey minute budget; if exhausted, skip fetch and fall back to placeholder
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
        const id = CG_NATIVE_ID[network]
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

interface Asset {
  id: string
  name: string
  symbol: string
  address: string
}

export type NetworkFilter = 'all' | SupportedNetworkKey

export type AppState = {
  // data
  started: boolean
  address: string | null
  mode: 'watch' | 'full'
  // ephemeral signer for full mode (never persisted)
  ephemeralWallet: Wallet | HDNodeWallet | null

  // portfolio data per network
  portfolio: Partial<Record<SupportedNetworkKey, AssetHolding[]>>
  enrichedPortfolio: Partial<Record<SupportedNetworkKey, AlchemyEnrichedHolding[]>>
  isPortfolioLoading: boolean
  selectedNetwork: NetworkFilter
  cgFilteredKeys: Set<string>
  cgPlaceholdersUsed: boolean

  // transactions per network (recent)
  transactions: Partial<Record<SupportedNetworkKey, TxSummary[]>>

  // actions (explicit, Zustand-style)
  setStarted: (started: boolean) => void
  setAddress: (address: string | null) => void
  setMode: (mode: 'watch' | 'full') => void
  setPortfolio: (p: Partial<Record<SupportedNetworkKey, AssetHolding[]>>) => void
  setSelectedNetwork: (f: NetworkFilter) => void
  setTransactions: (t: Partial<Record<SupportedNetworkKey, TxSummary[]>>) => void
  loadPortfolio: (address?: string, opts?: { force?: boolean }) => Promise<void>
  setCgFilteredKeys: (s: Set<string>) => void
  // signer actions
  setEphemeralWallet: (w: Wallet | HDNodeWallet | null) => void

  // legacy assets (keep for compatibility)
  assets: Asset[]
  setAssets: (assets: Asset[]) => void
}

export const appStore = createStore<AppState>((set, get) => ({
  // data
  started: false,
  address: '0xbFc80468Df050D2a73fE455d6b3e484caF00E12f',
  mode: 'watch',
  ephemeralWallet: null,
  portfolio: {},
  enrichedPortfolio: {},
  isPortfolioLoading: false,
  selectedNetwork: 'all',
  transactions: {},
  cgFilteredKeys: new Set<string>(),
  cgPlaceholdersUsed: false,
  // actions
  setStarted: (started) => set({ started }),
  setAddress: (address) =>
    set((s) => {
      // Only clear cached data if the address actually changes
      if (s.address === address) return {}
      return {
        address,
        portfolio: {},
        enrichedPortfolio: {},
        transactions: {},
        cgFilteredKeys: new Set<string>(),
        cgPlaceholdersUsed: false
      }
    }),
  setMode: (mode) =>
    set((s) => ({
      mode,
      // if switching to watch mode, drop the signer immediately
      ...(mode === 'watch' ? { ephemeralWallet: null } : {})
    })),
  setPortfolio: (p) => set({ portfolio: p }),
  setSelectedNetwork: (f) => set({ selectedNetwork: f }),
  setTransactions: (t) => set({ transactions: t }),
  setCgFilteredKeys: (s) => set({ cgFilteredKeys: s }),
  setEphemeralWallet: (w) => set({ ephemeralWallet: w }),
  loadPortfolio: async (addressArg, opts) => {
    const addr = addressArg ?? get().address
    if (!addr) return
    // Skip reloading if already enriched for this address and not forced
    if (!opts?.force && get().address === addr) {
      const hasAny = Object.keys(get().enrichedPortfolio ?? {}).length > 0
      if (hasAny) return
    }
    set({ isPortfolioLoading: true })
    try {
      const data = await fetchTokensByAddressAlchemyAllNetworks(addr, { withMetadata: true, withPrices: true })
      if (get().address !== addr) return
      const { portfolio: enrichedWithCg, filtered, placeholdersUsed } = await enrichAlchemyPortfolioWithCoinGecko(data)
      if (get().address !== addr) return
      set({ enrichedPortfolio: enrichedWithCg, cgFilteredKeys: filtered, cgPlaceholdersUsed: placeholdersUsed })
    } finally {
      set({ isPortfolioLoading: false })
    }
  },

  // legacy
  assets: [],
  setAssets: (assets) => set({ assets })
}))

// Hook that feels like Zustand's `useStore`
export const useAppStore = <T>(selector: (s: AppState) => T) => appStore.useStore(selector)

export const actions = {
  setStarted: (v: boolean) => appStore.get().setStarted(v),
  setAddress: (v: string | null) => appStore.get().setAddress(v),
  setMode: (v: 'watch' | 'full') => appStore.get().setMode(v),
  setPortfolio: (v: Partial<Record<SupportedNetworkKey, AssetHolding[]>>) => appStore.get().setPortfolio(v),
  setSelectedNetwork: (v: NetworkFilter) => appStore.get().setSelectedNetwork(v),
  setTransactions: (v: Partial<Record<SupportedNetworkKey, TxSummary[]>>) => appStore.get().setTransactions(v),
  loadPortfolio: (address?: string, opts?: { force?: boolean }) => appStore.get().loadPortfolio(address, opts),
  setAssets: (v: Asset[]) => appStore.get().setAssets(v),
  setCgFilteredKeys: (s: Set<string>) => appStore.get().setCgFilteredKeys(s),
  setEphemeralWallet: (w: Wallet | HDNodeWallet | null) => appStore.get().setEphemeralWallet(w)
}
