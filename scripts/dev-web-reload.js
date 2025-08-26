#!/usr/bin/env node
/*
 * Starts Expo for web (Metro on :8081) and a BrowserSync proxy on :3000
 * that auto-reloads the browser when project files change.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// Files to watch for triggering a browser reload (no HMR)
const watchGlobs = [
  'App.tsx',
  'app.json',
  'app.config.ts',
  '.env',
  '.env.local',
  'tamagui.config.ts',
  'components/**/*.ts',
  'components/**/*.tsx',
  'screens/**/*.ts',
  'screens/**/*.tsx',
  'providers/**/*.ts',
  'providers/**/*.tsx',
  'constants/**/*.ts',
  'constants/**/*.tsx',
  'store/**/*.ts',
  'store/**/*.tsx',
]

let bs // BrowserSync process

// --- Simple .env loader (no external deps) ---
function loadDotEnv(cwd) {
  const out = {}
  const files = [path.join(cwd, '.env'), path.join(cwd, '.env.local')]
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue
      const txt = fs.readFileSync(file, 'utf8')
      for (const line of txt.split(/\r?\n/)) {
        const s = line.trim()
        if (!s || s.startsWith('#')) continue
        const i = s.indexOf('=')
        if (i === -1) continue
        const key = s.slice(0, i).trim()
        let val = s.slice(i + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (key) out[key] = val
      }
    } catch {}
  }
  return out
}

function withExpoPublicEnv(baseEnv) {
  const merged = { ...baseEnv }
  const local = loadDotEnv(process.cwd())
  const keys = ['INFURA_API_KEY', 'ETHERSCAN_API_KEY', 'COINGECKO_API_KEY', 'ALCHEMY_API_KEY']
  for (const k of keys) {
    const v = merged[k] ?? local[k]
    if (v && !merged[`EXPO_PUBLIC_${k}`]) merged[`EXPO_PUBLIC_${k}`] = v
  }
  return merged
}

function mask(v) {
  if (!v) return '(empty)'
  const s = String(v)
  if (s.length <= 8) return `${s.slice(0, 2)}…(${s.length})`
  return `${s.slice(0, 4)}…(${s.length})`
}

function logEnvPreview(env) {
  const preview = {
    INFURA_API_KEY: mask(env.EXPO_PUBLIC_INFURA_API_KEY || env.INFURA_API_KEY),
    ETHERSCAN_API_KEY: mask(env.EXPO_PUBLIC_ETHERSCAN_API_KEY || env.ETHERSCAN_API_KEY),
    COINGECKO_API_KEY: mask(env.EXPO_PUBLIC_COINGECKO_API_KEY || env.COINGECKO_API_KEY),
    ALCHEMY_API_KEY: mask(env.EXPO_PUBLIC_ALCHEMY_API_KEY || env.ALCHEMY_API_KEY),
  }
  console.log('[web:reload] Env preview (masked):', preview)
}

function startBrowserSync(proxyUrl) {
  if (bs) return
  const args = [
    'browser-sync',
    'start',
    '--proxy',
    proxyUrl,
    '--files',
    watchGlobs.join(','),
    '--no-ui',
    '--no-notify',
    '--reload-delay',
    '300',
  ]
  console.log(`\n[web:reload] Starting BrowserSync proxy for ${proxyUrl} on http://localhost:3000 ...`)
  bs = spawn('npx', ['--yes', ...args], {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  })
  bs.on('exit', (code) => {
    if (code && code !== 0) {
      console.warn(`[web:reload] BrowserSync exited with code ${code}`)
    }
  })
}

console.log('[web:reload] Starting Expo web (Metro) on http://localhost:8081 ...')
const expoEnv = withExpoPublicEnv({
  ...process.env,
  // Polling helps on some Linux setups where inotify limits are low
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || '1',
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || 'true',
})

logEnvPreview(expoEnv)

const expo = spawn(
  // Use local Expo CLI via npx; this resolves to node_modules/.bin/expo
  'npx',
  ['expo', 'start', '--web'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    env: expoEnv,
  }
)

function maybeStartProxyFromOutput(chunk) {
  const text = chunk.toString()
  // Heuristic: once web is waiting or bundling starts, we can safely proxy
  const waitingMatch = text.match(/Web is waiting on (http:\/\/[^\s]+)/)
  if (waitingMatch) {
    startBrowserSync(waitingMatch[1])
  } else if (text.includes('Web Bundled')) {
    startBrowserSync('http://localhost:8081')
  }
  // Forward logs to console
  process.stdout.write(text)
}

expo.stdout.on('data', maybeStartProxyFromOutput)
expo.stderr.on('data', (d) => process.stderr.write(d.toString()))

function shutdown() {
  console.log('\n[web:reload] Shutting down...')
  if (bs && !bs.killed) {
    bs.kill('SIGINT')
  }
  if (expo && !expo.killed) {
    expo.kill('SIGINT')
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
