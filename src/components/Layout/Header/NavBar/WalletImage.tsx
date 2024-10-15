import { type ComponentWithAs, type IconProps, Image } from '@chakra-ui/react'

type WalletImageProps = {
  walletInfo: {
    icon: ComponentWithAs<'svg', IconProps> | string
  } | null
}

export const WalletImage = ({ walletInfo }: WalletImageProps) => {
  if (!walletInfo) return null
  if (typeof walletInfo.icon === 'string')
    return <Image src={walletInfo.icon} width={6} height='auto' alt='Wallet Icon' />
  const Icon = walletInfo.icon
  return <Icon width='6' height='auto' />
}
