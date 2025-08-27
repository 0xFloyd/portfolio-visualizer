import { PropsWithChildren, useState } from 'react'
import { ThemedText } from './ThemedText'
import { ThemedView } from './ThemedView'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '../constants/Colors'
import { XStack, YStack } from 'tamagui'

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const theme = 'light'

  return (
    <ThemedView>
      <XStack
        gap="$2"
        onPress={() => setIsOpen((value) => !value)}
        pressStyle={{ opacity: 0.9 }}
        style={{ alignItems: 'center' }}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </XStack>
      {isOpen && (
        <YStack mt="$2" ml="$3">
          {children}
        </YStack>
      )}
    </ThemedView>
  )
}
