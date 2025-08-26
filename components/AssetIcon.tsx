import React from 'react'
import { Image } from 'react-native'
import { Avatar, Stack, Text } from 'tamagui'
import type { SupportedNetworkKey } from '../providers/ethers'

type Props = {
  uri?: string
  fallbackUri?: string
  fallbackText?: string
  network?: SupportedNetworkKey
  size?: number
  style?: any
}

export const NETWORK_BADGES: Partial<Record<SupportedNetworkKey, any>> = {
  arbitrum: require('../assets/images/arbitrum.png'),
  optimism: require('../assets/images/optimism.png'),
  polygon: require('../assets/images/polygon.png'),
  base: require('../assets/images/base.png')
  // mainnet: no badge
}

export default function AssetIcon({ uri, fallbackUri, fallbackText, network, size = 44, style }: Props) {
  const [src, setSrc] = React.useState<string | undefined>(uri)
  React.useEffect(() => {
    setSrc(uri)
  }, [uri])
  const badgeSrc = network ? NETWORK_BADGES[network] : undefined
  // Scale the badge a bit larger for small icons so it's still recognizable
  const badgeRatio = size <= 24 ? 0.55 : 0.42
  const badgeSize = Math.max(8, Math.round(size * badgeRatio))
  const badgeInner = Math.max(2, badgeSize - 4)

  return (
    <Stack width={size} height={size} position="relative" overflow="visible" style={style}>
      <Avatar circular width={size} height={size} bg="#eef2ff">
        {src ? (
          <Avatar.Image src={src} onError={() => fallbackUri && setSrc(fallbackUri)} />
        ) : (
          <Avatar.Fallback>{fallbackText ? <Text fontWeight="600">{fallbackText}</Text> : null}</Avatar.Fallback>
        )}
      </Avatar>

      {badgeSrc ? (
        <Stack
          position="absolute"
          right={0}
          bottom={0}
          width={badgeSize}
          height={badgeSize}
          backgroundColor="white"
          borderRadius={9999}
          alignItems="center"
          justifyContent="center"
          zIndex={10}
          elevation={10}
          pointerEvents="none"
          borderWidth={1}
          borderColor="#e5e7eb"
        >
          <Image
            source={badgeSrc}
            style={{ width: badgeInner, height: badgeInner, borderRadius: badgeInner / 2 }}
            resizeMode="cover"
          />
        </Stack>
      ) : null}
    </Stack>
  )
}
