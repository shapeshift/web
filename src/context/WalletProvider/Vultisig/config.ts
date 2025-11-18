import type { VultisigAdapter } from '@shapeshiftoss/hdwallet-vultisig'

import { VultisigIcon } from '@/components/Icons/VultisigIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type VultisigConfigType = Omit<SupportedWalletInfo<typeof VultisigAdapter>, 'routes'>

export const VultisigConfig: VultisigConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-vultisig').then(m => m.VultisigAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: VultisigIcon,
  name: 'Vultisig',
}
