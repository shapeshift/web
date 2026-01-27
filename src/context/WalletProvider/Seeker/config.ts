import type { SupportedWalletInfo } from '@/context/WalletProvider/config'
import { SeekerIcon } from '@/components/Icons/SeekerIcon'

type SeekerConfigType = Omit<SupportedWalletInfo<any>, 'routes'>

export const SeekerConfig: SeekerConfigType = {
  adapters: [
    {
      loadAdapter: async () => {
        const { SeekerHDWallet } = await import('@shapeshiftoss/hdwallet-seeker')
        return SeekerHDWallet as any
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
