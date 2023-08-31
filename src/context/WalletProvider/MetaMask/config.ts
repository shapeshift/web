import { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import { MetaMaskAdapter as MetaMaskSnapAdapter } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { getConfig } from 'config'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const MetaMaskConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS ? MetaMaskSnapAdapter : MetaMaskAdapter,
  ],
  supportsMobile: 'browser',
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
