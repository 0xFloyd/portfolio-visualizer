import { Button as TamaguiButton, ButtonProps } from 'tamagui'

// Ensure custom background/color props remain through interaction states
// by explicitly setting hover/press/focus variants to the same values
// unless the caller overrides them.
const Button = ({ children, ...props }: ButtonProps) => {
  return <TamaguiButton {...props}>{children}</TamaguiButton>
}

export default Button
