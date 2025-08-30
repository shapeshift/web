import type { ImageProps } from '@chakra-ui/react'
import { Box, Center, Image, Spinner } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import qrImage from 'qr-image'

import { AssetIcon } from '../AssetIcon'

type QRCodeProps = {
  loading?: boolean
  text?: string
  asset?: Asset
} & ImageProps

export const QRCode = ({ loading, text = '', asset, ...props }: QRCodeProps) => {
  // Use high error correction when asset icon is present, medium otherwise
  const ecLevel = asset ? 'H' : 'M'
  const buffer = qrImage.imageSync(text, { type: 'png', margin: 2, ec_level: ecLevel })
  const dataURI = 'data:image/png;base64,' + buffer.toString('base64')

  if (loading) {
    return (
      <Center>
        <Spinner />
      </Center>
    )
  }

  return (
    <Center position='relative'>
      <Image src={dataURI} boxSize='3xs' {...props} />
      {asset && (
        <Center position='absolute' width='48px' height='48px'>
          <Box position='absolute' bg='white' borderRadius='full' width='48px' height='48px' />
          <AssetIcon asset={asset} position='absolute' size='md' showNetworkIcon={false} />
        </Center>
      )}
    </Center>
  )
}
