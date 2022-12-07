import type { InitialState } from 'context/WalletProvider/WalletProvider'

type WalletImageProps = Pick<InitialState, 'walletInfo'>

export const WalletImage = ({ walletInfo }: WalletImageProps) => {
  const Icon = walletInfo?.icon
  if (Icon) {
    return <Icon width='6' height='auto' />
  }
  return null
}
