import { Text as TamaguiText, TextProps } from 'tamagui'

const Text = ({ children, ...props }: TextProps) => {
  return <TamaguiText {...props}>{children}</TamaguiText>
}

export default Text
