import { HapticLevel, mobileVibrate } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from './globals'

export const vibrate = (level: HapticLevel): Promise<void> | boolean => {
	if (isMobile) {
		return mobileVibrate(level)
	}

	if ('vibrate' in navigator) {
		return navigator.vibrate(200)
	}

	return false
}
