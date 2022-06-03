import { WalletConnectAdapter } from '@shapeshiftoss/hdwallet-walletconnect'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'

export const WalletConnectConfig = {
  adapter: WalletConnectAdapter,
  mobileEnabled: true,
  icon: WalletConnectIcon,
  name: 'WalletConnect',
}
