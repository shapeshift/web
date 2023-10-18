import { getConfig } from 'config'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const MetaMaskConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () =>
        getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
          ? import('@shapeshiftoss/hdwallet-shapeshift-multichain').then(m => m.MetaMaskAdapter)
          : import('@shapeshiftoss/hdwallet-metamask').then(m => m.MetaMaskAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
