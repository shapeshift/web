import type { KeplrAdapter } from '@shapeshiftoss/hdwallet-keplr'
import { KeplrIcon } from 'components/Icons/KeplrIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type KeplrConfigType = Omit<SupportedWalletInfo<typeof KeplrAdapter>, 'routes'>

export const KeplrConfig: KeplrConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-keplr').then(m => m.KeplrAdapter),
    },
  ],
  icon: KeplrIcon,
  name: 'Keplr',
}
