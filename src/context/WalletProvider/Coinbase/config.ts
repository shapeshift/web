import type { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import { CoinbaseIcon } from 'components/Icons/CoinbaseIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type CoinbaseConfigType = Omit<SupportedWalletInfo<typeof CoinbaseAdapter>, 'routes'>

export const CoinbaseConfig: CoinbaseConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-coinbase').then(m => m.CoinbaseAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: CoinbaseIcon,
  name: 'Coinbase',
}
