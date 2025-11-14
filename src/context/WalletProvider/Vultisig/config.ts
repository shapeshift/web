import type { VultisigAdapter } from '@shapeshiftoss/hdwallet-vultisig'

import { PhantomIcon } from '@/components/Icons/PhantomIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type VultisigConfigType = Omit<SupportedWalletInfo<typeof VultisigAdapter>, 'routes'>

export const VultisigConfig: VultisigConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-vultisig').then(m => m.VultisigAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: PhantomIcon,
  name: 'Vultisig',
}
