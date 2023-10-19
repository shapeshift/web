import type { XDEFIAdapter } from '@shapeshiftoss/hdwallet-xdefi'
import { XDEFIIcon } from 'components/Icons/XDEFIIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type XDEFIConfigType = Omit<SupportedWalletInfo<typeof XDEFIAdapter>, 'routes'>

export const XDEFIConfig: XDEFIConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-xdefi').then(m => m.XDEFIAdapter),
    },
  ],
  icon: XDEFIIcon,
  name: 'XDEFI',
}
