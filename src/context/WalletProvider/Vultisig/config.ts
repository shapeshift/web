import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import type { VultisigAdapter } from '@shapeshiftoss/hdwallet-vultisig'

import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type VultisigConfigType = Omit<SupportedWalletInfo<typeof VultisigAdapter>, 'routes'>

// Placeholder icon component - actual icon comes from MIPD provider
const VultisigIcon: ComponentWithAs<'svg', IconProps> = (() => null) as any

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
