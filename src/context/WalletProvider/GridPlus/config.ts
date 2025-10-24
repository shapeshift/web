import type { GridPlusAdapter } from '@shapeshiftoss/hdwallet-gridplus'

import { GridPlusIcon } from '@/components/Icons/GridPlusIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type GridPlusConfigType = Omit<SupportedWalletInfo<typeof GridPlusAdapter>, 'routes'>

export const GridPlusConfig: GridPlusConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-gridplus').then(m => m.GridPlusAdapter),
    },
  ],
  icon: GridPlusIcon,
  name: 'GridPlus',
}
