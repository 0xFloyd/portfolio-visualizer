import { createTamagui } from 'tamagui'
import { config as defaultConfig } from '@tamagui/config'

const config = createTamagui({
  ...defaultConfig,
  // Add project-specific accent values into themes, so $accent works everywhere
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      accent: '#FC72FF',
      accentHover: '#FF8AFF',
      accentPress: '#E05DE6',
      accentContrast: '#0A0A0A'
    },
    dark: {
      ...defaultConfig.themes.dark,
      accent: '#FC72FF',
      accentHover: '#FF8AFF',
      accentPress: '#E05DE6',
      accentContrast: '#0A0A0A'
    }
  }
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
