import type { NativeAdapter } from '@shapeshiftoss/hdwallet-native'

import { SeekerIcon } from '@/components/Icons/SeekerIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

/**
 * Seeker Wallet Configuration
 *
 * NOTE: Seeker wallet does NOT use a traditional hdwallet adapter.
 * Instead, it communicates with the mobile app's SeekerWalletManager
 * via postMessage, which handles all MWA operations.
 *
 * The NativeAdapter type is used as a placeholder for type compatibility,
 * but the actual wallet instance will be null for Seeker connections.
 */
type SeekerConfigType = Omit<SupportedWalletInfo<typeof NativeAdapter>, 'routes'>

export const SeekerConfig: SeekerConfigType = {
  adapters: [
    {
      // Seeker doesn't use a traditional hdwallet adapter
      // Signing is handled via mobile app message handlers
      loadAdapter: () => Promise.resolve(null as unknown as typeof NativeAdapter),
    },
  ],
  supportsMobile: 'app', // Only available in mobile app context
  icon: SeekerIcon,
  name: 'Seeker',
  description: 'Solana Mobile Seeker Wallet',
}

/**
 * App identity configuration for Mobile Wallet Adapter
 * Used by the mobile app's SeekerWalletManager
 */
export const SEEKER_APP_IDENTITY = {
  name: 'ShapeShift',
  uri: 'https://app.shapeshift.com',
  icon: '/favicon.ico',
}

/**
 * Default cluster for Seeker wallet
 */
export const SEEKER_DEFAULT_CLUSTER = 'mainnet-beta' as const
