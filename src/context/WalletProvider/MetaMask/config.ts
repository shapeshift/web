import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const MetaMaskConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: MetaMaskAdapter,
  supportsMobile: 'browser',
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
