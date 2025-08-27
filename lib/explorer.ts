import type { SupportedNetworkKey } from '../providers/ethers'

const BASE: Record<SupportedNetworkKey, string> = {
  mainnet: 'https://etherscan.io',
  optimism: 'https://optimistic.etherscan.io',
  arbitrum: 'https://arbiscan.io',
  base: 'https://basescan.org',
  polygon: 'https://polygonscan.com'
}

export const explorerTxUrl = (network: SupportedNetworkKey, hash: string) => `${BASE[network]}/tx/${hash}`
