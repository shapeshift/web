import type { TonConnectAdapter } from './TonConnectAdapter'

import { TonConnectIcon } from '@/components/Icons/TonConnectIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type TonConnectConfigType = Omit<SupportedWalletInfo<typeof TonConnectAdapter>, 'routes'>

export const TonConnectConfig: TonConnectConfigType = {
  adapters: [
    {
      loadAdapter: () => import('./TonConnectAdapter').then(m => m.TonConnectAdapter),
    },
  ],
  supportsMobile: 'both',
  icon: TonConnectIcon,
  name: 'TON Connect',
}
