/**
 * Simplified: single light scheme for now. Ignore dark props.
 */
import { Colors } from '../constants/Colors'

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const colorFromProps = props.light
  if (colorFromProps) return colorFromProps
  return Colors.light[colorName]
}
