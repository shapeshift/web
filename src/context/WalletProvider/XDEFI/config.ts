import { XDEFIAdapter } from '@shapeshiftoss/hdwallet-xdefi'
import { XDEFIIcon } from 'components/Icons/XDEFIIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const XDEFIConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: XDEFIAdapter,
  icon: XDEFIIcon,
  name: 'XDEFI',
}
