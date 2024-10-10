import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type MetaMaskConfigType = Omit<SupportedWalletInfo<typeof MetaMaskAdapter>, 'routes'>

export const MetaMaskConfig: MetaMaskConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-metamask-multichain').then(m => m.MetaMaskAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: MetaMaskIcon,
  name: 'MetaMask',
}
