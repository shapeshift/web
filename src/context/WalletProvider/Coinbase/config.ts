import { CoinbaseIcon } from 'components/Icons/CoinbaseIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const CoinbaseConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-coinbase').then(m => m.CoinbaseAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: CoinbaseIcon,
  name: 'Coinbase',
}
