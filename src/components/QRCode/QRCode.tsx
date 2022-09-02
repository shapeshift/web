import { Center, Image, ImageProps, Spinner } from '@chakra-ui/react'
import qrImage from 'qr-image'

type QRCodeProps = {
  loading?: boolean
  text?: string
} & ImageProps

export const QRCode = ({ loading, text = '', ...props }: QRCodeProps) => {
  const buffer = qrImage.imageSync(text, { type: 'png', margin: 2 })
  const dataURI = 'data:image/png;base64,' + buffer.toString('base64')

  return <Center>{loading ? <Spinner /> : <Image src={dataURI} boxSize='3xs' {...props} />}</Center>
}
