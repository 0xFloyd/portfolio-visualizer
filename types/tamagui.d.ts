import type { Conf } from '../tamagui.config'

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
