import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask'
import type { MetaMaskAdapter as MetaMaskMultiChainAdapter } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import { getConfig } from 'config'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type MetaMaskConfigType = Omit<
  SupportedWalletInfo<typeof MetaMaskAdapter | MetaMaskMultiChainAdapter>,
  'routes'
>

export const MetaMaskConfig: MetaMaskConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        // @ts-ignore TODO(gomes): FIXME
        getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS
          ? import('@shapeshiftoss/hdwallet-shapeshift-multichain').then(m => m.MetaMaskAdapter)
          : import('@shapeshiftoss/hdwallet-metamask').then(m => m.MetaMaskAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
