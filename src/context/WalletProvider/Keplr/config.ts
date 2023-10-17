import { KeplrIcon } from 'components/Icons/KeplrIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const KeplrConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-keplr').then(m => m.KeplrAdapter),
    },
  ],
  icon: KeplrIcon,
  name: 'Keplr',
}
