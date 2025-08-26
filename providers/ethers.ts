import { ethers } from 'ethers'
import { ENV } from '@/constants/env'
// import { createRateLimiter, retryWithBackoff, parallelMapWithLimit, sleep } from '../lib/utils'
import { parallelMapWithLimit } from '../lib/utils'

// NOTE: The MetaMask / window.ethereum setup below was used previously.
// It will not work on Snack, which runs in a web sandbox without injected providers.
// Keeping for reference as requested; DO NOT DELETE.
// let signer = null
// let provider
// if (window.ethereum == null) {
//   // If MetaMask is not installed, we use the default provider,
//   // which is backed by a variety of third-party services (such
//   // as INFURA). They do not have private keys installed,
//   // so they only have read-only access
//   console.log('MetaMask not installed; using read-only defaults')
//   provider = ethers.getDefaultProvider()
// } else {
//   // Connect to the MetaMask EIP-1193 object. This is a standard
//   // protocol that allows Ethers access to make all read-only
//   // requests through MetaMask.
//   provider = new ethers.BrowserProvider(window.ethereum)
//   // It also provides an opportunity to request access to write
//   // operations, which will be performed by the private key
//   // that MetaMask manages for the user.
//   signer = await provider.getSigner()
// }

// API keys are supplied via Expo config extras or EXPO_PUBLIC_* envs
const INFURA_API_KEY = ENV.INFURA_API_KEY
const ETHERSCAN_API_KEY = ENV.ETHERSCAN_API_KEY

function _mask(v?: string) {
  if (!v) return '(empty)'
  const s = String(v)
  if (s.length <= 8) return `${s.slice(0, 2)}…(${s.length})`
  return `${s.slice(0, 4)}…(${s.length})`
}

try {
  // eslint-disable-next-line no-console
  console.log('[ethers] INFURA_API_KEY (masked):', _mask(INFURA_API_KEY))
  // eslint-disable-next-line no-console
  console.log('[ethers] ETHERSCAN_API_KEY (masked):', _mask(ETHERSCAN_API_KEY))
} catch {}

// -------------------- RPC Rate Limiting & Retry (disabled for debugging) --------------------
/*
// Lightweight global limiter for Infura to avoid 429/-32005 bursts across all networks
const INFURA_MAX_CONCURRENT = 6 // total concurrent RPC calls across all networks
const INFURA_MIN_DELAY_BETWEEN_REQUESTS_MS = 60 // min spacing between RPC call starts (~<= ~16 rps)
const RPC_RETRY_ATTEMPTS = 5
const RPC_RETRY_BASE_DELAY_MS = 250
const RPC_RETRY_MAX_DELAY_MS = 5000

const infuraLimiter = createRateLimiter(INFURA_MAX_CONCURRENT, INFURA_MIN_DELAY_BETWEEN_REQUESTS_MS)

function isRateLimitError(e: any): boolean {
  const code = (e?.status ?? e?.code ?? e?.error?.code) as any
  const msg = (e?.message || e?.error?.message || '') as string
  if (code === 429) return true
  if (code === -32005) return true // Infura Too Many Requests (JSON-RPC)
  if (typeof msg === 'string' && /too many requests|rate limit/i.test(msg)) return true
  // Ethers may wrap server errors
  const innerCode = e?.info?.error?.code
  const innerMsg = e?.info?.error?.message
  if (innerCode === 429 || innerCode === -32005) return true
  if (typeof innerMsg === 'string' && /too many requests|rate limit/i.test(innerMsg)) return true
  return false
}

async function retryWithExponentialBackoff<T>(fn: () => Promise<T>): Promise<T> {
  return retryWithBackoff(fn, {
    attempts: RPC_RETRY_ATTEMPTS,
    baseDelayMs: RPC_RETRY_BASE_DELAY_MS,
    maxDelayMs: RPC_RETRY_MAX_DELAY_MS,
    jitterRatio: 0.3,
    isRetryable: (e) => isRateLimitError(e)
  })
}

function wrapProviderWithLimiter<T extends ethers.JsonRpcProvider>(provider: T): T {
  const originalSend = provider.send.bind(provider)
  ;(provider as any).send = async (method: string, params: any[]) => {
    return infuraLimiter.schedule(() => retryWithExponentialBackoff(() => originalSend(method, params)))
  }
  return provider
}
*/

// -------------------- Minimal global RPC pacer --------------------
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

// Use shared parallelMapWithLimit

// Chain configs we care about
export const NETWORKS = {
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    rpc: INFURA_API_KEY
      ? `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
      : 'https://cloudflare-eth.com',
    nativeSymbol: 'ETH'
  },
  polygon: {
    name: 'matic',
    chainId: 137,
    rpc: INFURA_API_KEY
      ? `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`
      : 'https://polygon-rpc.com',
    nativeSymbol: 'MATIC'
  },
  optimism: {
    name: 'optimism',
    chainId: 10,
    rpc: INFURA_API_KEY
      ? `https://optimism-mainnet.infura.io/v3/${INFURA_API_KEY}`
      : 'https://mainnet.optimism.io',
    nativeSymbol: 'ETH'
  },
  arbitrum: {
    name: 'arbitrum',
    chainId: 42161,
    rpc: INFURA_API_KEY
      ? `https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`
      : 'https://arb1.arbitrum.io/rpc',
    nativeSymbol: 'ETH'
  },
  base: {
    name: 'base',
    chainId: 8453,
    rpc: INFURA_API_KEY
      ? `https://base-mainnet.infura.io/v3/${INFURA_API_KEY}`
      : 'https://mainnet.base.org',
    nativeSymbol: 'ETH'
  }
} as const

export type SupportedNetworkKey = keyof typeof NETWORKS

// Lazy singletons per network
const providersByNetwork: Partial<Record<SupportedNetworkKey, ethers.JsonRpcProvider>> = {}

export function getReadonlyProvider(network: SupportedNetworkKey): ethers.JsonRpcProvider {
  const existing = providersByNetwork[network]
  if (existing) return existing

  const cfg = NETWORKS[network]
  const provider = new ethers.JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: true })
  // Wrap JSON-RPC send with the minimal pacer (no backoff/retry, just spacing)
  const originalSend = provider.send.bind(provider)
  ;(provider as any).send = (method: string, params: any[]) => paceRpc(() => originalSend(method, params))
  providersByNetwork[network] = provider
  return provider
}

// Convenience helpers
export async function getNativeBalance(address: string, network: SupportedNetworkKey) {
  const provider = getReadonlyProvider(network)
  // short TTL cache to avoid spamming RPC for same address/network
  const key = `${network}:${address.toLowerCase()}`
  const now = Date.now()
  const cached = nativeBalanceCache.get(key)
  if (cached && cached.expiresAt > now) return cached.value
  const balance = await provider.getBalance(address)
  nativeBalanceCache.set(key, { value: balance, expiresAt: now + NATIVE_BALANCE_TTL_MS })
  return balance
}

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

// Canonical Multicall3 address on these networks
const MULTICALL3: Record<SupportedNetworkKey, string> = {
  mainnet: '0xcA11bde05977b3631167028862bE2a173976CA11',
  polygon: '0xcA11bde05977b3631167028862bE2a173976CA11',
  optimism: '0xcA11bde05977b3631167028862bE2a173976CA11',
  arbitrum: '0xcA11bde05977b3631167028862bE2a173976CA11',
  base: '0xcA11bde05977b3631167028862bE2a173976CA11'
}

const multicallAbi = [
  'function aggregate((address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)'
] as const

// Cache for native balances (avoid bursty getBalance)
const NATIVE_BALANCE_TTL_MS = 10000
const nativeBalanceCache = new Map<string, { value: bigint; expiresAt: number }>()

// Dynamic ERC-20 discovery using Etherscan-style explorer APIs per network.
// We use the address's token transfer history to infer the set of tokens,
// then query on-chain balances for that discovered set.
const TOKEN_DISCOVERY_TTL_MS = 60_000
const discoveredTokensCache = new Map<string, { tokens: TokenInfo[]; expiresAt: number }>()

async function discoverTokensForNetwork(address: string, network: SupportedNetworkKey): Promise<TokenInfo[]> {
  const cacheKey = `${network}:${address.toLowerCase()}`
  const now = Date.now()
  const cached = discoveredTokensCache.get(cacheKey)
  if (cached && cached.expiresAt > now) return cached.tokens

  try {
    const base = EXPLORER_API[network]
    // Use tokentx to pull ERC-20 transfer history; dedupe by contract address
    const url = `${base}/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&page=1&offset=1000&sort=desc${ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : ''}`
    const res = await fetch(url)
    const json = (await res.json()) as any
    const ok = json?.status === '1' || json?.message === 'OK'
    const list: any[] = ok && Array.isArray(json?.result) ? json.result : []

    const byAddress = new Map<string, TokenInfo>()
    for (const it of list) {
      const addrRaw = it?.contractAddress
      if (!addrRaw || typeof addrRaw !== 'string') continue
      let checksummed = addrRaw
      try {
        checksummed = ethers.getAddress(addrRaw)
      } catch {}
      const key = checksummed.toLowerCase()
      if (byAddress.has(key)) continue

      const decimalsRaw = it?.tokenDecimal ?? it?.decimals
      const decimalsNum = (() => {
        const n = Number(decimalsRaw)
        return Number.isFinite(n) ? Math.max(0, Math.min(255, n)) : 18
      })()

      const symbol = (it?.tokenSymbol ?? '').toString() || 'UNKNOWN'
      const name = (it?.tokenName ?? '').toString() || symbol

      byAddress.set(key, {
        address: checksummed,
        symbol,
        name,
        decimals: decimalsNum
      })
    }

    const tokens = Array.from(byAddress.values())
    discoveredTokensCache.set(cacheKey, { tokens, expiresAt: now + TOKEN_DISCOVERY_TTL_MS })
    return tokens
  } catch {
    return []
  }
}

export async function fetchTokenBalancesForNetwork(
  address: string,
  network: SupportedNetworkKey,
  tokenList?: TokenInfo[]
): Promise<AssetHolding[]> {
  const provider = getReadonlyProvider(network)
  const tokens = tokenList ?? (await discoverTokensForNetwork(address, network))

  const iface = new ethers.Interface(erc20Abi as any)
  const calls = tokens.map((t) => ({
    target: t.address,
    callData: iface.encodeFunctionData('balanceOf', [address])
  }))

  const multicall = new ethers.Contract(MULTICALL3[network], multicallAbi, provider)
  let returnData: string[] = []
  if (calls.length > 0) {
    try {
      const res = await multicall.aggregate(calls)
      // res: [blockNumber, bytes[]]
      returnData = res[1] as string[]
    } catch (e) {
      // Fallback: parallel balanceOf calls if multicall is unavailable
      const responses = await parallelMapWithLimit(tokens, 3, async (t) => {
        try {
          const c = new ethers.Contract(t.address, erc20Abi, provider)
          const bal: bigint = await c.balanceOf(address)
          return ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [bal])
        } catch {
          return ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [0n])
        }
      })
      returnData = responses
    }
  }

  const decoded: AssetHolding[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const data = returnData[i]
    try {
      const decodedResult = new ethers.AbiCoder().decode(['uint256'], data)
      const raw = decodedResult[0] as bigint
      if (raw > 0n) {
        const formatted = formatWithDecimals(raw, t.decimals)
        decoded.push({
          id: `${network}:${t.address}`,
          network,
          isNative: false,
          token: t,
          balanceRaw: raw,
          balanceFormatted: formatted
        })
      }
    } catch {
      // ignore bad decode
    }
  }

  // Native balance
  try {
    const native = await provider.getBalance(address)
    if (native > 0n) {
      decoded.unshift({
        id: `${network}:NATIVE`,
        network,
        isNative: true,
        token: undefined,
        balanceRaw: native,
        balanceFormatted: formatEther(native)
      })
    }
  } catch {}

  return decoded
}

export async function fetchPortfolioAllNetworks(address: string): Promise<Record<SupportedNetworkKey, AssetHolding[]>> {
  const keys = Object.keys(NETWORKS) as SupportedNetworkKey[]
  const results = await Promise.all(
    keys.map((k) => fetchTokenBalancesForNetwork(address, k).then((v) => [k, v] as const))
  )
  return Object.fromEntries(results) as Record<SupportedNetworkKey, AssetHolding[]>
}

export function formatWithDecimals(value: bigint, decimals: number): string {
  if (decimals === 18) return ethers.formatEther(value)
  // generic formatter
  const factor = 10n ** BigInt(decimals)
  const whole = value / factor
  const frac = value % factor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString()
}

// -------------------- Transaction Helpers --------------------
export type TxSummary = {
  network: SupportedNetworkKey
  hash: string
  from: string
  to: string | null
  value: bigint // native value (wei)
  blockNumber: number
  timeStamp: number // seconds since epoch
}

// Public explorer API endpoints compatible with Etherscan's API schema
const EXPLORER_API: Record<SupportedNetworkKey, string> = {
  mainnet: 'https://api.etherscan.io',
  polygon: 'https://api.polygonscan.com',
  optimism: 'https://api-optimistic.etherscan.io',
  arbitrum: 'https://api.arbiscan.io',
  base: 'https://api.basescan.org'
}

// Using the public demo token by default; swap with a real key if available.

export async function fetchRecentTransactionsForNetwork(
  address: string,
  network: SupportedNetworkKey,
  limit = 10
): Promise<TxSummary[]> {
  try {
    const base = EXPLORER_API[network]
    const url = `${base}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=999999999&page=1&offset=${limit}&sort=desc${ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : ''}`
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
  const keys = Object.keys(NETWORKS) as SupportedNetworkKey[]
  const results = await Promise.all(
    keys.map((k) => fetchRecentTransactionsForNetwork(address, k, perNetwork).then((v) => [k, v] as const))
  )
  return Object.fromEntries(results) as Record<SupportedNetworkKey, TxSummary[]>
}
