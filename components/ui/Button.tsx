import { Button as TamaguiButton, ButtonProps } from 'tamagui'

// Ensure custom background/color props remain through interaction states
// by explicitly setting hover/press/focus variants to the same values
// unless the caller overrides them.
type AppButtonProps = ButtonProps & {
  accent?: boolean
}

const Button = ({ children, accent, ...props }: AppButtonProps) => {
  if (accent) {
    return (
      <TamaguiButton
        bg="$accent"
        color="white"
        hoverStyle={{ bg: '$accentHover' }}
        pressStyle={{ bg: '$accentPress' }}
        focusStyle={{ bg: '$accent' }}
        width="100%"
        {...props}
      >
        {children}
      </TamaguiButton>
    )
  }
  return (
    <TamaguiButton
      bg="#22222214"
      color="#000000"
      hoverStyle={{ bg: '#22222220' }}
      pressStyle={{ bg: '#2222222e' }}
      focusStyle={{ bg: '#22222214' }}
      width="100%"
      {...props}
    >
      {children}
    </TamaguiButton>
  )
}

export default Button
