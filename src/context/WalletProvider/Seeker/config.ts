import type { SeekerHDWallet } from '@shapeshiftoss/hdwallet-seeker'

import { SeekerIcon } from '@/components/Icons/SeekerIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type SeekerConfigType = Omit<SupportedWalletInfo<typeof SeekerHDWallet>, 'routes'>

export const SeekerConfig: SeekerConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-seeker').then(m => m.SeekerHDWallet),
    },
  ],
  supportsMobile: 'app',
  icon: SeekerIcon,
  name: 'Seeker',
  description: 'Solana Mobile Seeker Wallet',
}

export const SEEKER_DEFAULT_CLUSTER = 'mainnet-beta' as const
