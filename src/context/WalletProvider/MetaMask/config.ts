import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'

export const MetaMaskConfig = {
  adapter: MetaMaskAdapter,
  mobileEnabled: true,
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
