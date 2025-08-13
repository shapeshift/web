import { isMobile } from './globals'

import type { HapticLevel } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { mobileVibrate } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'

export const vibrate = (level: HapticLevel): Promise<void> | boolean => {
  if (isMobile) {
    return mobileVibrate(level)
  }

  if ('vibrate' in navigator) {
    return navigator.vibrate(200)
  }

  return false
}
