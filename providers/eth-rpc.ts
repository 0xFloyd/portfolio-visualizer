import { ethers } from 'ethers'
import { ENV } from '../constants/env'
import { CHAINS, NETWORK_KEYS, SupportedNetworkKey, createRateLimiter } from '../lib/utils'
import { getAlchemyProvider } from './alchemy-data'

const ETHERSCAN_API_KEY = ENV.ETHERSCAN_API_KEY

const MIN_RPC_GAP_MS = 250
const rpcPacer = createRateLimiter(1, MIN_RPC_GAP_MS)

const explorerSiteFromApi = (api: string) =>
  api
    .replace(/^https?:\/\/api-/, 'https://')
    .replace(/^https?:\/\/api\./, 'https://')
    .replace(/\/api$/, '')

export const explorerTxUrl = (network: SupportedNetworkKey, hash: string) =>
  `${explorerSiteFromApi(CHAINS[network].explorerApi)}/tx/${hash}`

const providersByNetwork: Partial<Record<SupportedNetworkKey, ethers.JsonRpcProvider>> = {}

export function getReadonlyProvider(network: SupportedNetworkKey): ethers.JsonRpcProvider {
  const existing = providersByNetwork[network]
  if (existing) return existing

  const cfg = CHAINS[network]
  const provider =
    getAlchemyProvider(network) ?? new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: true })
  const originalSend = provider.send.bind(provider)
  ;(provider as any).send = (method: string, params: any[]) => rpcPacer.schedule(() => originalSend(method, params))
  providersByNetwork[network] = provider
  return provider
}

// Note: Using these in Snack will still send via the JSON-RPC
export function walletFromMnemonic(mnemonicOrSeedPhrase: string) {
  return ethers.Wallet.fromPhrase(mnemonicOrSeedPhrase)
}

export function walletFromPrivateKey(privateKey: string) {
  return new ethers.Wallet(privateKey)
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

export type TxSummary = {
  network: SupportedNetworkKey
  hash: string
  from: string
  to: string | null
  value: bigint
  blockNumber: number
  timeStamp: number
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
  const keys = NETWORK_KEYS as SupportedNetworkKey[]
  const results = await Promise.all(
    keys.map((k) => fetchRecentTransactionsForNetwork(address, k, perNetwork).then((v) => [k, v] as const))
  )
  return Object.fromEntries(results) as Record<SupportedNetworkKey, TxSummary[]>
}
