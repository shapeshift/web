import { WalletConnectAdapter } from '@shapeshiftoss/hdwallet-walletconnect'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const WalletConnectConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [WalletConnectAdapter],
  supportsMobile: 'both',
  icon: WalletConnectIcon,
  name: 'WalletConnect',
}
