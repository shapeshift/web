import { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const WalletConnectV2Config: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [WalletConnectV2Adapter],
  supportsMobile: 'both',
  icon: WalletConnectIcon,
  name: 'WalletConnectV2',
  description: 'v2',
}
