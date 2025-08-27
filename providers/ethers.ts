import { ethers } from 'ethers'
import { ENV } from '../constants/env'
import { CHAINS, NETWORK_KEYS } from '../constants/chains'
import { getAlchemyProvider } from './alchemy'

const ETHERSCAN_API_KEY = ENV.ETHERSCAN_API_KEY

// Very small, single-queue pacer to avoid RPS bursts across ALL networks.
// Keeps a minimum gap between JSON-RPC call starts.
const MIN_RPC_GAP_MS = 250
let rpcChain: Promise<any> = Promise.resolve()
let lastRpcStartAt = 0

async function paceRpc<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now()
    const wait = Math.max(0, lastRpcStartAt + MIN_RPC_GAP_MS - now)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastRpcStartAt = Date.now()
    return fn()
  }
  rpcChain = rpcChain.then(run, run)
  return rpcChain as Promise<T>
}

export const NETWORKS = {
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    // Prefer Alchemy via getReadonlyProvider; this is a public fallback for reads
    rpc: 'https://cloudflare-eth.com',
    nativeSymbol: 'ETH'
  },
  polygon: {
    name: 'matic',
    chainId: 137,
    rpc: 'https://polygon-rpc.com',
    nativeSymbol: 'MATIC'
  },
  optimism: {
    name: 'optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    nativeSymbol: 'ETH'
  },
  arbitrum: {
    name: 'arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    nativeSymbol: 'ETH'
  },
  base: {
    name: 'base',
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    nativeSymbol: 'ETH'
  }
} as const

export type SupportedNetworkKey = keyof typeof NETWORKS

const providersByNetwork: Partial<Record<SupportedNetworkKey, ethers.JsonRpcProvider>> = {}

export function getReadonlyProvider(network: SupportedNetworkKey): ethers.JsonRpcProvider {
  const existing = providersByNetwork[network]
  if (existing) return existing

  const cfg = NETWORKS[network]
  // Prefer Alchemy when ALCHEMY_API_KEY is present; otherwise fall back to public RPC
  const provider =
    getAlchemyProvider(network) ?? new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: true })
  // Wrap JSON-RPC send with the minimal pacer (no backoff/retry, just spacing)
  const originalSend = provider.send.bind(provider)
  ;(provider as any).send = (method: string, params: any[]) => paceRpc(() => originalSend(method, params))
  providersByNetwork[network] = provider
  return provider
}

// Convenience helpers
// getNativeBalance removed (unused after unified portfolio path)

export function formatEther(value: ethers.BigNumberish) {
  return ethers.formatEther(value)
}

// Wallet import helpers (seed phrase or private key) for write access when in "full" mode.
// Note: Using these in Snack will still send via the JSON-RPC. Manage keys carefully.
export function walletFromMnemonic(mnemonicOrSeedPhrase: string) {
  // ethers v6: fromPhrase validates checksum and length
  return ethers.Wallet.fromPhrase(mnemonicOrSeedPhrase)
}

export function walletFromPrivateKey(privateKey: string) {
  return new ethers.Wallet(privateKey)
}

export function connectWalletToNetwork(wallet: ethers.Wallet, network: SupportedNetworkKey): ethers.Wallet {
  const provider = getReadonlyProvider(network)
  return wallet.connect(provider)
}

// ERC-20 minimal interface for balance/transfer
export const erc20Abi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function transfer(address,uint256) returns (bool)'
] as const

export function getErc20Contract(tokenAddress: string, network: SupportedNetworkKey) {
  const provider = getReadonlyProvider(network)
  return new ethers.Contract(tokenAddress, erc20Abi, provider)
}

export function getErc20ContractWithSigner(tokenAddress: string, signer: ethers.Signer) {
  return new ethers.Contract(tokenAddress, erc20Abi, signer)
}

// -------------------- Portfolio Helpers --------------------
export type TokenInfo = {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export type AssetHolding = {
  id: string
  network: SupportedNetworkKey
  isNative: boolean
  token?: TokenInfo
  balanceRaw: bigint
  balanceFormatted: string
}
// Portfolio discovery/balances helpers removed in favor of unified Alchemy + CoinGecko path.

export type TxSummary = {
  network: SupportedNetworkKey
  hash: string
  from: string
  to: string | null
  value: bigint // native value (wei)
  blockNumber: number
  timeStamp: number // seconds since epoch
}

export async function fetchRecentTransactionsForNetwork(
  address: string,
  network: SupportedNetworkKey,
  limit = 10
): Promise<TxSummary[]> {
  try {
    const base = CHAINS[network].explorerApi
    const url = `${base}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=999999999&page=1&offset=${limit}&sort=desc${
      ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : ''
    }`
    const res = await fetch(url)
    const json = (await res.json()) as any
    const ok = json?.status === '1' || json?.message === 'OK'
    if (!ok || !Array.isArray(json?.result)) {
      return []
    }
    const list: any[] = json.result
    return list.map((it) => ({
      network,
      hash: it.hash,
      from: it.from,
      to: it.to || null,
      value: BigInt(it.value ?? '0'),
      blockNumber: Number(it.blockNumber ?? 0),
      timeStamp: Number(it.timeStamp ?? 0)
    }))
  } catch {
    return []
  }
}

export async function fetchRecentTransactionsAllNetworks(
  address: string,
  perNetwork = 10
): Promise<Record<SupportedNetworkKey, TxSummary[]>> {
  // Change under TODO step: Consolidate network iteration (item 4)
  const keys = NETWORK_KEYS as SupportedNetworkKey[]
  const results = await Promise.all(
    keys.map((k) => fetchRecentTransactionsForNetwork(address, k, perNetwork).then((v) => [k, v] as const))
  )
  return Object.fromEntries(results) as Record<SupportedNetworkKey, TxSummary[]>
}
