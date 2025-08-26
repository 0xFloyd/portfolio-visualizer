import type { ExpoConfig } from '@expo/config-types'
import fs from 'fs'
import path from 'path'

// Minimal .env loader (no external dependency)
function loadDotEnvFiles(cwd: string): Record<string, string> {
  const out: Record<string, string> = {}
  const files = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
  ]
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue
      const txt = fs.readFileSync(file, 'utf8')
      for (const line of txt.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (key) out[key] = val
      }
    } catch {
      // ignore parse errors
    }
  }
  return out
}

const cwd = process.cwd()
const localEnv = loadDotEnvFiles(cwd)

// Helper to read a key from process.env first, then .env, else ''
const read = (k: string): string => {
  return process.env[k] ?? process.env[`EXPO_PUBLIC_${k}`] ?? localEnv[k] ?? ''
}

const config: ExpoConfig = {
  name: 'my-app',
  slug: 'my-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    favicon: './assets/images/favicon.png',
  },
  plugins: [],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Runtime-accessible keys (read via expo-constants in app code)
    INFURA_API_KEY: read('INFURA_API_KEY'),
    ETHERSCAN_API_KEY: read('ETHERSCAN_API_KEY'),
    COINGECKO_API_KEY: read('COINGECKO_API_KEY'),
    ALCHEMY_API_KEY: read('ALCHEMY_API_KEY'),
  },
}

export default config

