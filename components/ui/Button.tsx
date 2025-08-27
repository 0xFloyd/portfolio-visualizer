import { Button as TamaguiButton, ButtonProps } from 'tamagui'

// Ensure custom background/color props remain through interaction states
// by explicitly setting hover/press/focus variants to the same values
// unless the caller overrides them.
type AppButtonProps = ButtonProps & {
  accent?: boolean
  variant?: 'primary' | 'neutral'
}

const Button = ({ children, accent, variant, ...props }: AppButtonProps) => {
  if (accent || variant === 'primary') {
    return (
      <TamaguiButton
        bg={props.bg ?? '$accent'}
        color={props.color ?? 'white'}
        hoverStyle={{ bg: props.bg ?? '$accentHover' }}
        pressStyle={{ bg: props.bg ?? '$accentPress' }}
        focusStyle={{ bg: props.bg ?? '$accent' }}
        width="100%"
        {...props}
      >
        {children}
      </TamaguiButton>
    )
  }
  return (
    <TamaguiButton
      bg={props.bg ?? '#22222214'}
      color={props.color ?? '#000000'}
      hoverStyle={{ bg: props.bg ?? '#22222220' }}
      pressStyle={{ bg: props.bg ?? '#2222222e' }}
      focusStyle={{ bg: props.bg ?? '#22222214' }}
      width="100%"
      {...props}
    >
      {children}
    </TamaguiButton>
  )
}

export default Button
