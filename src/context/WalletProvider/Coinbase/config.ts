import { CoinbaseAdapter } from '@shapeshiftoss/hdwallet-coinbase'
import { CoinbaseIcon } from 'components/Icons/CoinbaseIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const CoinbaseConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [CoinbaseAdapter],
  supportsMobile: 'browser',
  icon: CoinbaseIcon,
  name: 'Coinbase',
}
