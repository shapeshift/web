import { WalletConnectAdapter } from '@shapeshiftoss/hdwallet-walletconnect'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const WalletConnectV2Config: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [WalletConnectAdapter],
  supportsMobile: 'both',
  icon: WalletConnectIcon,
  name: 'WalletConnect',
  description: 'v2',
}
