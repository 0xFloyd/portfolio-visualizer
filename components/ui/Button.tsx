import { Button as TamaguiButton, ButtonProps } from 'tamagui'

type AppButtonProps = ButtonProps & {
  accent?: boolean
  variant?: 'primary' | 'neutral'
}

const Button = ({ children, accent, variant, ...props }: AppButtonProps) => {
  if (accent || variant === 'primary') {
    return (
      <TamaguiButton
        borderRadius={12}
        bg={props.bg ?? '$accent'}
        fontWeight={600}
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
      borderRadius={12}
      bg={props.bg ?? '$badge'}
      fontWeight={600}
      color={props.color ?? '$badgeText'}
      hoverStyle={{ bg: props.bg ?? '$badgeHover' }}
      pressStyle={{ bg: props.bg ?? '$badgePress' }}
      focusStyle={{ bg: props.bg ?? '$badge' }}
      width="100%"
      {...props}
    >
      {children}
    </TamaguiButton>
  )
}

export default Button
