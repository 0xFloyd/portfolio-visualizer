import { color, radius, size, space, themes, zIndex } from '@tamagui/themes'
import { createTamagui, createTokens } from 'tamagui'
import { defaultConfig } from '@tamagui/config/v4'

// Extend color tokens with project-specific accent palette
const colorTokens = {
  ...color,
  // Main accent family
  accent: '#FC72FF',
  accentHover: '#FF8AFF',
  accentPress: '#E05DE6',
  accentContrast: '#0A0A0A'
}

const tokens = createTokens({
  size,
  space,
  zIndex,
  color: colorTokens,
  radius
})

const config = createTamagui({
  ...defaultConfig
  // themes,
  // tokens
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
