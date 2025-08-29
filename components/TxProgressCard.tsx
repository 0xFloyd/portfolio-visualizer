import React from 'react'
import { YStack, XStack, Text, Separator } from 'tamagui'
import TxStages, { type TxStage } from './TxStages'
import InlineNotice from './ui/InlineNotice'
import Button from './ui/Button'
import { CHAINS, SupportedNetworkKey, shorten } from '../lib/utils'

type Props = {
  stage: TxStage
  hasTxHash?: boolean
  txHash?: string | null
  from?: string
  to?: string
  amount?: string | number
  tokenSymbol?: string
  network?: SupportedNetworkKey
  feeNative?: string | null
  confirmedAt?: number | null
  onViewExplorer?: (() => void) | null
  onDone?: () => void
}

export default function TxProgressCard({
  stage,
  hasTxHash,
  txHash,
  from,
  to,
  amount,
  tokenSymbol,
  network,
  feeNative,
  confirmedAt,
  onViewExplorer,
  onDone
}: Props) {
  const native = network ? CHAINS[network]?.nativeSymbol ?? 'ETH' : 'ETH'
  const isSuccess = stage === 'success'

  return (
    <YStack
      w="100%"
      maw={520}
      bg="white"
      borderWidth={1}
      borderColor="#e5e7eb"
      borderRadius={16}
      p="$4"
      gap="$4"
      elevation="$1"
      alignSelf="center"
    >
      <YStack ai="center" jc="center" gap="$3">
        <TxStages stage={stage} hasTxHash={!!hasTxHash} />

        {isSuccess && (
          <InlineNotice variant="success" align="center" gap="$2" px={14} py={10}>
            <Text fontSize={16} color="#065f46">
              Transaction confirmed
            </Text>
          </InlineNotice>
        )}
      </YStack>

      {stage !== 'idle' && (
        <>
          <Separator borderColor="#e5e7eb" />
          <YStack gap="$2">
            <DetailRow label="From" value={shorten(from)} />
            <DetailRow label="To" value={shorten(to)} />
            <DetailRow
              label="Amount"
              value={amount != null && tokenSymbol ? `${amount} ${tokenSymbol}` : amount != null ? String(amount) : '—'}
            />
            <DetailRow label="Network fee" value={feeNative ? `${feeNative} ${native}` : '—'} />
            <DetailRow label="Hash" value={shorten(txHash ?? undefined)} />
            <DetailRow label="Confirmed at" value={confirmedAt ? new Date(confirmedAt).toLocaleString() : '—'} />
          </YStack>
        </>
      )}

      <XStack ai="center" jc="center" gap="$3" pt="$2">
        {onViewExplorer ? (
          <Button bg="#e5e7eb" fullWidth={false} onPress={onViewExplorer}>
            <Text>View on Explorer</Text>
          </Button>
        ) : null}
      </XStack>
    </YStack>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <XStack ai="center" jc="space-between" gap="$3">
      <Text color="#6b7280">{label}</Text>
      <Text numberOfLines={1} ta="right">
        {value}
      </Text>
    </XStack>
  )
}
