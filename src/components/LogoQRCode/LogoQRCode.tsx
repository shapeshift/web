import { Box, Center, Spinner } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { QRCode } from 'react-qrcode-logo'

import { AssetIcon } from '../AssetIcon'

type LogoQRCodeProps = {
  text?: string
  asset: Asset
  loading?: boolean
  size?: number
}

// Create a transparent 1x1 pixel image as a placeholder
const transparentPixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export const LogoQRCode = ({ text = '', asset, loading, size = 180 }: LogoQRCodeProps) => {
  if (loading)
    return (
      <Center>
        <Spinner />
      </Center>
    )

  return (
    <Center position='relative'>
      <QRCode
        value={text}
        size={size}
        logoHeight={40}
        logoWidth={40}
        logoPaddingStyle='circle'
        logoPadding={2}
        logoImage={transparentPixel}
        removeQrCodeBehindLogo
        ecLevel='H'
      />
      <Box position='absolute'>
        <AssetIcon asset={asset} size='md' showNetworkIcon={false} />
      </Box>
    </Center>
  )
}
