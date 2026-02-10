import { SeekerHDWallet } from '@shapeshiftoss/hdwallet-seeker'

import { SeekerIcon } from '@/components/Icons/SeekerIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type SeekerConfigType = Omit<SupportedWalletInfo<any>, 'routes'>

export const SeekerConfig: SeekerConfigType = {
  adapters: [
    {
      loadAdapter: () => {
        return new Promise(resolve => resolve(SeekerHDWallet))
      },
    },
  ],
  supportsMobile: 'app',
  icon: SeekerIcon,
  name: 'Seeker',
  description: 'Solana Mobile Seeker Wallet',
}

export const SEEKER_APP_IDENTITY = {
  name: 'ShapeShift',
  uri: 'https://app.shapeshift.com',
  icon: '/favicon.ico',
}

export const SEEKER_DEFAULT_CLUSTER = 'mainnet-beta' as const
