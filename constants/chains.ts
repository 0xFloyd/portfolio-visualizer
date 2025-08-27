export type SupportedNetworkKey = 'mainnet' | 'polygon' | 'optimism' | 'arbitrum' | 'base'

// TODO:
// replace with // before
// nativeName(network) // & nativeSymbol(network)
// // after
// CHAINS[network].displayName
// CHAINS[network].nativeSymbol
// PLATFORM_ID + NATIVE_COIN_ID clones (defined in your CG code & again in store) — dedupe to CHAINS. I can see both the platform/native ids near your CG enrichment logic and in the store.  ￼  ￼
// 	•	ALCHEMY_CHAIN_SLUGS living in providers/alchemy.ts — fold into CHAINS.alchemySlugs.  ￼
// 	•	EXPLORER_API in providers/ethers.ts — fold into CHAINS.explorerApi.  ￼
// 	•	NETWORK_BADGES in components/AssetIcon.tsx — use CHAINS[network].badge.  ￼
export const CHAINS: Record<
  SupportedNetworkKey,
  {
    displayName: string
    nativeSymbol: 'ETH' | 'MATIC'
    cgPlatformId: string // for /coins/{platform}/contract lookups
    nativeCgId: string // for /simple/price
    explorerApi: string // Etherscan-family base
    alchemySlugs: string[] // Data API
    badge?: any // require(...) for AssetIcon
  }
> = {
  mainnet: {
    displayName: 'Ethereum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'ethereum',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.etherscan.io',
    alchemySlugs: ['eth-mainnet'],
    badge: require('../assets/images/ethereum.png')
  },
  polygon: {
    displayName: 'Polygon',
    nativeSymbol: 'MATIC',
    cgPlatformId: 'polygon-pos',
    nativeCgId: 'matic-network',
    explorerApi: 'https://api.polygonscan.com',
    alchemySlugs: ['polygon-mainnet', 'matic-mainnet'],
    badge: require('../assets/images/polygon.png')
  },
  optimism: {
    displayName: 'Optimism',
    nativeSymbol: 'ETH',
    cgPlatformId: 'optimistic-ethereum',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api-optimistic.etherscan.io',
    alchemySlugs: ['opt-mainnet'],
    badge: require('../assets/images/optimism.png')
  },
  arbitrum: {
    displayName: 'Arbitrum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'arbitrum-one',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.arbiscan.io',
    alchemySlugs: ['arb-mainnet'],
    badge: require('../assets/images/arbitrum.png')
  },
  base: {
    displayName: 'Base',
    nativeSymbol: 'ETH',
    cgPlatformId: 'base',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.basescan.org',
    alchemySlugs: ['base-mainnet'],
    badge: require('../assets/images/base.png')
  }
} as const

export const NETWORK_KEYS = Object.keys(CHAINS) as (keyof typeof CHAINS)[]
