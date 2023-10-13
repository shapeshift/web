import { XDEFIIcon } from 'components/Icons/XDEFIIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const XDEFIConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-xdefi').then(m => m.XDEFIAdapter),
    },
  ],
  icon: XDEFIIcon,
  name: 'XDEFI',
}
