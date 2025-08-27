import React from 'react'
import { Image } from 'tamagui'
import { Avatar, Stack, Text } from 'tamagui'
import type { SupportedNetworkKey } from '../providers/ethers'
import { CHAINS } from '../constants/chains'

type Props = {
  uri?: string
  fallbackUri?: string
  fallbackText?: string
  network?: SupportedNetworkKey
  size?: number
  style?: any
}

// Change under TODO step: CHAINS as single source (items 1 & 6)
// Use CHAINS[network].badge instead of a local NETWORK_BADGES map.

export default function AssetIcon({ uri, fallbackUri, fallbackText, network, size = 44, style }: Props) {
  const [src, setSrc] = React.useState<string | undefined>(uri)
  React.useEffect(() => {
    setSrc(uri)
  }, [uri])
  const badgeSrc = network ? CHAINS[network]?.badge : undefined
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
          width={badgeSize}
          height={badgeSize}
          style={{
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            borderRadius: 9999,
            zIndex: 10,
            elevation: 10
          }}
          pointerEvents="none"
          borderWidth={1}
          borderColor="#e5e7eb"
        >
          <Image
            source={badgeSrc}
            width={badgeInner}
            height={badgeInner}
            borderRadius={badgeInner / 2}
            resizeMode="cover"
          />
        </Stack>
      ) : null}
    </Stack>
  )
}
