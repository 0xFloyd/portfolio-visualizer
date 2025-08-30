import { ethers } from 'ethers'

export type SupportedNetworkKey = 'mainnet' | 'polygon' | 'optimism' | 'arbitrum' | 'base'

export const CHAINS: Record<
  SupportedNetworkKey,
  {
    displayName: string
    tokenName: string
    nativeSymbol: 'ETH' | 'MATIC'
    cgPlatformId: string // coins/{platform}/contract lookups
    nativeCgId: string // simple/price
    explorerApi: string // Etherscan
    alchemySlugs: string[] // Data API
    alchemyRpcSubdomain: string // Alchemy RPC host subdomain
    badge?: any // require(...) for AssetIcon
    rpc: string
    chainId: number
    nativeDecimals: number
  }
> = {
  mainnet: {
    displayName: 'Ethereum',
    tokenName: 'Ethereum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'ethereum',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.etherscan.io',
    alchemySlugs: ['eth-mainnet'],
    alchemyRpcSubdomain: 'eth-mainnet',
    badge: require('../assets/images/ethereum.png'),
    rpc: 'https://cloudflare-eth.com',
    chainId: 1,
    nativeDecimals: 18
  },
  base: {
    displayName: 'Base',
    tokenName: 'Ethereum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'base',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.basescan.org',
    alchemySlugs: ['base-mainnet'],
    alchemyRpcSubdomain: 'base-mainnet',
    badge: require('../assets/images/base.png'),
    rpc: 'https://mainnet.base.org',
    chainId: 8453,
    nativeDecimals: 18
  },
  optimism: {
    displayName: 'Optimism',
    tokenName: 'Ethereum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'optimistic-ethereum',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api-optimistic.etherscan.io',
    alchemySlugs: ['opt-mainnet'],
    alchemyRpcSubdomain: 'opt-mainnet',
    badge: require('../assets/images/optimism.png'),
    rpc: 'https://mainnet.optimism.io',
    chainId: 10,
    nativeDecimals: 18
  },
  polygon: {
    displayName: 'Polygon',
    tokenName: 'MATIC',
    nativeSymbol: 'MATIC',
    cgPlatformId: 'polygon-pos',
    nativeCgId: 'matic-network',
    explorerApi: 'https://api.polygonscan.com',
    alchemySlugs: ['polygon-mainnet', 'matic-mainnet'],
    alchemyRpcSubdomain: 'polygon-mainnet',
    badge: require('../assets/images/polygon.png'),
    rpc: 'https://polygon-rpc.com',
    chainId: 137,
    nativeDecimals: 18
  },
  arbitrum: {
    displayName: 'Arbitrum',
    tokenName: 'Ethereum',
    nativeSymbol: 'ETH',
    cgPlatformId: 'arbitrum-one',
    nativeCgId: 'ethereum',
    explorerApi: 'https://api.arbiscan.io',
    alchemySlugs: ['arb-mainnet'],
    alchemyRpcSubdomain: 'arb-mainnet',
    badge: require('../assets/images/arbitrum.png'),
    rpc: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    nativeDecimals: 18
  }
} as const

export const NETWORK_KEYS = Object.keys(CHAINS) as (keyof typeof CHAINS)[]

export type RateLimiter = {
  schedule<T>(task: () => Promise<T>): Promise<T>
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createRateLimiter(maxConcurrent: number, minSpacingMs: number): RateLimiter {
  let inFlight = 0
  let nextAvailableAt = 0
  const queue: Array<() => void> = []
  let scheduled = false

  function drain() {
    if (scheduled) return
    scheduled = true
    const tryStart = () => {
      scheduled = false
      while (inFlight < maxConcurrent && queue.length > 0) {
        const fn = queue.shift()!
        fn()
      }
      if (queue.length > 0 && inFlight < maxConcurrent) {
        const delay = Math.max(0, nextAvailableAt - Date.now())
        scheduled = true
        setTimeout(tryStart, Math.min(delay, 25))
      }
    }
    setTimeout(tryStart, 0)
  }

  async function schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const waitMs = Math.max(0, nextAvailableAt - Date.now())
          if (waitMs > 0) await sleep(waitMs)
          inFlight++
          nextAvailableAt = Date.now() + minSpacingMs
          const result = await task()
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          inFlight--
          drain()
        }
      }
      queue.push(run)
      drain()
    })
  }

  return { schedule }
}

export async function parallelMapWithLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (limit <= 1) {
    const out: R[] = []
    for (let i = 0; i < items.length; i++) out.push(await worker(items[i], i))
    return out
  }
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const runners: Promise<void>[] = []
  const runNext = async () => {
    const i = nextIndex++
    if (i >= items.length) return
    results[i] = await worker(items[i], i)
    await runNext()
  }
  for (let c = 0; c < Math.min(limit, items.length); c++) runners.push(runNext())
  await Promise.all(runners)
  return results
}

export function coerceChange24hPct(t: any): number | undefined {
  const candidates = [t?.price?.percentChange24h, t?.priceChange24hPct, t?.usd_24h_change]
  for (const c of candidates) {
    const n = typeof c === 'string' ? Number(c) : c
    if (typeof n === 'number' && isFinite(n)) return n
  }
  return undefined
}

export function formatWithDecimals(value: bigint, decimals: number): string {
  const factor = 10n ** BigInt(decimals)
  const whole = value / factor
  const frac = value % factor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString()
}

export function isAddress(v: string): boolean {
  try {
    return ethers.isAddress((v || '').trim())
  } catch {
    return false
  }
}

export function toBigIntFromHexOrDec(v: string): bigint {
  if (typeof v !== 'string') return 0n
  const s = v.trim()
  if (/^0x/i.test(s)) return BigInt(s)
  return BigInt(s)
}

export const shortenAddress = (addr?: string, first = 5, last = 4) => {
  if (!addr) return ''
  const a = addr.trim()
  if (a.length <= first + last) return a
  return `${a.slice(0, first)}…${a.slice(-last)}`
}

export const shorten = (s?: string, first = 6, last = 4, fallback = '—') =>
  s ? (s.length > first + last ? `${s.slice(0, first)}…${s.slice(-last)}` : s) : fallback

export const shortenHash = (h?: string, first = 8, last = 6) => (h ? shorten(h, first, last, '') : '')

export function formatAgeShort(tsSec: number) {
  if (!tsSec) return '-'
  const now = Math.floor(Date.now() / 1000)
  const delta = Math.max(0, now - tsSec)
  const m = Math.floor(delta / 60)
  const h = Math.floor(delta / 3600)
  const d = Math.floor(delta / 86400)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return `${delta}s`
}

export function formatNumberFixed(n: number, fractionDigits = 3): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(n)
}

export function formatNumberCompact(input?: string | number): string {
  const n = typeof input === 'string' ? Number(input) : Number(input ?? 0)
  if (!isFinite(n) || n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1) {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(n)
  }
  const s = (typeof input === 'string' ? input : String(n)).replace(/^0+/, '0')
  const parts = s.split('.')
  if (parts.length === 1) return '0'
  const frac = parts[1] || ''
  const leadingZeros = frac.match(/^0+/)?.[0]?.length ?? 0
  const needed = leadingZeros + 3
  const sliceLen = Math.min(frac.length, needed)
  const outFrac = frac.slice(0, sliceLen).replace(/0+$/, (m) => (sliceLen > leadingZeros ? m : ''))
  return `0.${outFrac || '0'}`
}

export const nativeName = (n: SupportedNetworkKey) => CHAINS[n].tokenName
export const nativeSymbol = (n: SupportedNetworkKey) => CHAINS[n].nativeSymbol

export const cleanSymbol = (raw?: string, max = 6) => {
  if (!raw) return ''
  const first = raw.trim().split(/[\s|/\\,;:–-]+/)[0]
  const safe = first.replace(/[^A-Za-z0-9.$]/g, '') // allow A-Z 0-9 . $
  if (!safe) return ''
  return safe.length > max ? `${safe.slice(0, max)}…` : safe
}

export const cleanName = (raw?: string, max = 28) => {
  if (!raw) return ''
  // remove urls / t.me etc
  const noUrls = raw.replace(/https?:\/\/\S+|t\.me\/\S+/gi, '')
  const first = noUrls.split(/[\|\n]+/)[0]
  // trim leading emoji/symbol noise like ✅ 🚀 etc
  const noLeadEmoji = first.replace(/^[^A-Za-z0-9]+/, '')
  const compact = noLeadEmoji.replace(/\s+/g, ' ').trim()
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact
}

// Try to extract a concise, user-friendly reason from a thrown error.
// Falls back to the first 150 characters of the error string.
export function formatErrorForDisplay(err: any, maxLen: number = 150): string {
  const stringify = (v: any) =>
    typeof v === 'string' ? v : typeof v?.message === 'string' ? v.message : String(v ?? '')

  let raw = ''
  try {
    // common fields across providers/libs
    raw = err?.reason || err?.shortMessage || err?.error?.message || err?.data?.message || stringify(err)
  } catch {
    raw = stringify(err)
  }

  // Pull reason="..."
  let match = /reason="([^"]+)"/i.exec(raw)
  if (match?.[1]) return match[1]

  // execution reverted: "..."
  match = /execution reverted[:\s]+"([^"]+)"/i.exec(raw)
  if (match?.[1]) return match[1]

  // reverted with reason string '...'
  match = /reverted with reason string '([^']+)'/i.exec(raw)
  if (match?.[1]) return match[1]

  // Friendly mappings for common cases
  if (/insufficient funds/i.test(raw)) return 'Insufficient funds for gas or value'
  if (/user rejected/i.test(raw)) return 'User rejected the request'

  const trimmed = raw.trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen).replace(/\s+$/, '') + '…'
}
