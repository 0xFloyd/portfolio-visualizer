import { createStore } from './createStore'
import type { AssetHolding, SupportedNetworkKey, TxSummary } from '../providers/ethers'
import type { AlchemyEnrichedHolding } from '../providers/alchemy'
import { fetchPortfolio as fetchUnifiedPortfolio } from '../api/unified'
import type { Wallet, HDNodeWallet } from 'ethers'

export type NetworkFilter = 'all' | SupportedNetworkKey

export type AppState = {
  started: boolean
  address: string | null
  mode: 'watch' | 'full'
  // ephemeral signer
  ephemeralWallet: Wallet | HDNodeWallet | null

  portfolio: Partial<Record<SupportedNetworkKey, AssetHolding[]>>
  enrichedPortfolio: Partial<Record<SupportedNetworkKey, AlchemyEnrichedHolding[]>>
  isPortfolioLoading: boolean
  selectedNetwork: NetworkFilter
  cgFilteredKeys: Set<string>
  cgPlaceholdersUsed: boolean

  transactions: Partial<Record<SupportedNetworkKey, TxSummary[]>>

  // (zustand style)
  setStarted: (started: boolean) => void
  setAddress: (address: string | null) => void
  setMode: (mode: 'watch' | 'full') => void
  setPortfolio: (p: Partial<Record<SupportedNetworkKey, AssetHolding[]>>) => void
  setSelectedNetwork: (f: NetworkFilter) => void
  setTransactions: (t: Partial<Record<SupportedNetworkKey, TxSummary[]>>) => void
  loadPortfolio: (address?: string, opts?: { force?: boolean }) => Promise<void>
  setCgFilteredKeys: (s: Set<string>) => void
  setEphemeralWallet: (w: Wallet | HDNodeWallet | null) => void
}

export const appStore = createStore<AppState>((set, get) => ({
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
      // if switching to watch mode delete signer
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
    // Skip reloading if already have data
    if (!opts?.force && get().address === addr) {
      const hasAny = Object.keys(get().enrichedPortfolio ?? {}).length > 0
      if (hasAny) return
    }
    set({ isPortfolioLoading: true })
    try {
      const { enrichedPortfolio, cgFilteredKeys, cgPlaceholdersUsed } = await fetchUnifiedPortfolio(addr)
      if (get().address !== addr) return
      set({ enrichedPortfolio, cgFilteredKeys, cgPlaceholdersUsed })
    } finally {
      set({ isPortfolioLoading: false })
    }
  }
}))

// closest to zustand style
export const useAppStore = <T>(selector: (s: AppState) => T) => appStore.useStore(selector)

export const actions = {
  setStarted: (v: boolean) => appStore.get().setStarted(v),
  setAddress: (v: string | null) => appStore.get().setAddress(v),
  setMode: (v: 'watch' | 'full') => appStore.get().setMode(v),
  setPortfolio: (v: Partial<Record<SupportedNetworkKey, AssetHolding[]>>) => appStore.get().setPortfolio(v),
  setSelectedNetwork: (v: NetworkFilter) => appStore.get().setSelectedNetwork(v),
  setTransactions: (v: Partial<Record<SupportedNetworkKey, TxSummary[]>>) => appStore.get().setTransactions(v),
  loadPortfolio: (address?: string, opts?: { force?: boolean }) => appStore.get().loadPortfolio(address, opts),
  setCgFilteredKeys: (s: Set<string>) => appStore.get().setCgFilteredKeys(s),
  setEphemeralWallet: (w: Wallet | HDNodeWallet | null) => appStore.get().setEphemeralWallet(w)
}
