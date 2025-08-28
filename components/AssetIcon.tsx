import React from 'react'
import { Stack, Text, Image } from 'tamagui'
import type { SupportedNetworkKey } from '../providers/ethers'
import { CHAINS } from '../constants/chains'

type Props = {
  name?: string
  uri?: string
  fallbackUri?: string
  fallbackText?: string
  network?: SupportedNetworkKey
  size?: number // px
  style?: any
}

export default function AssetIcon({ name, uri, fallbackUri, fallbackText, network, size = 44, style }: Props) {
  const [src, setSrc] = React.useState<string | undefined>(uri)
  React.useEffect(() => setSrc(uri), [uri])

  const badgeSrc = network ? CHAINS[network]?.badge : undefined

  const badgeRatio = size <= 24 ? 0.55 : 0.5
  const badgeSize = Math.max(8, Math.round(size * badgeRatio))
  const badgePad = Math.max(2, Math.round(badgeSize * 0.12))
  const badgeInner = Math.max(6, badgeSize - badgePad * 2)
  const badgeOffset = Math.round(badgeSize * 0.12) // overlap a touch

  const toImageSource = (val?: any) => (typeof val === 'string' ? { uri: val } : val)
  let imgSrc = name === 'Ethereum' ? require('../assets/images/ethereum.png') : toImageSource(src)

  return (
    <Stack w={size} h={size} pos="relative" overflow="visible" style={style}>
      <Stack w="100%" h="100%" br={size / 2} overflow="hidden" bg="#FC72FF30" ai="center" jc="center">
        {src ? (
          <Image
            source={imgSrc}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => (fallbackUri ? setSrc(fallbackUri) : setSrc(undefined))}
          />
        ) : fallbackText ? (
          <Text color="#FC72FF" fontWeight="700" fontSize={Math.max(10, Math.round(size * 0.38))}>
            {fallbackText}
          </Text>
        ) : null}
      </Stack>

      {badgeSrc ? (
        <Stack
          pos="absolute"
          w={badgeSize}
          h={badgeSize}
          right={-badgeOffset}
          bottom={-badgeOffset}
          ai="center"
          jc="center"
          bg="white"
          br={9999}
          zIndex={10}
          borderWidth={1}
          borderColor="#e5e7eb"
          pointerEvents="none"
          shadowColor="black"
          shadowOpacity={0.15}
          shadowRadius={2}
          shadowOffset={{ width: 0, height: 1 }}
        >
          <Image
            source={toImageSource(badgeSrc)}
            w={badgeInner}
            h={badgeInner}
            br={badgeInner / 2}
            resizeMode="cover"
          />
        </Stack>
      ) : null}
    </Stack>
  )
}
