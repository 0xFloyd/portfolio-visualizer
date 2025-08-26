import React from 'react'
import { Text, XStack, YStack, Stack, Spinner } from 'tamagui'

export type TxStage = 'idle' | 'preparing' | 'broadcasting' | 'confirming' | 'success' | 'error'

type Props = {
  stage: TxStage
  hasTxHash?: boolean
  style?: any
}

const STEPS: Array<Exclude<TxStage, 'idle' | 'success' | 'error'>> = ['preparing', 'broadcasting', 'confirming']

function stageIndex(stage: TxStage, hasTxHash?: boolean): number {
  switch (stage) {
    case 'preparing':
      return 0
    case 'broadcasting':
      return 1
    case 'confirming':
      return 2
    case 'success':
      return 3
    case 'error':
      // Infer progress: if we have a tx hash, we likely reached confirming
      return hasTxHash ? 2 : 0
    default:
      return -1
  }
}

export default function TxStages({ stage, hasTxHash, style }: Props) {
  const idx = stageIndex(stage, hasTxHash)
  if (idx < 0) return null

  return (
    <YStack gap="$1" style={style}>
      {STEPS.map((name, i) => {
        const isDone = idx > i
        const isActive = idx === i && stage !== 'success' && stage !== 'error'
        const isPending = idx < i
        const color = isDone ? '#059669' : isActive ? '#111827' : '#6b7280'
        return (
          <XStack key={name} ai="center" gap="$2">
            <Stack width={14} height={14} ai="center" jc="center">
              {isActive ? (
                <Spinner color="#111827" style={{ transform: [{ scale: 0.8 }] }} />
              ) : isDone ? (
                <Text color="#059669">✓</Text>
              ) : (
                <Stack
                  width={8}
                  height={8}
                  borderRadius={999}
                  backgroundColor="#d1d5db"
                />
              )}
            </Stack>
            <Text color={color}>
              {name === 'preparing' && 'Preparing'}
              {name === 'broadcasting' && 'Broadcasting'}
              {name === 'confirming' && 'Waiting for confirmation'}
            </Text>
          </XStack>
        )
      })}

      {stage === 'error' && (
        <XStack ai="center" gap="$2">
          <Text color="#ef4444">✗</Text>
          <Text color="#ef4444">Error</Text>
        </XStack>
      )}
    </YStack>
  )
}

