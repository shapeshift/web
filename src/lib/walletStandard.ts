import { getWallets } from '@wallet-standard/app'
import type { Wallet } from '@wallet-standard/base'

// Singleton - getWallets() is safe to call multiple times, returns same instance
const walletsApi = getWallets()

/**
 * Find a Wallet Standard wallet by name and chain prefix.
 * MetaMask registers SEPARATE wallet objects for Bitcoin and Solana.
 * Example: findWalletStandardWallet('MetaMask', 'bitcoin') finds MM's BTC wallet
 */
export const findWalletStandardWallet = (name: string, chainPrefix: string): Wallet | undefined => {
  return walletsApi
    .get()
    .find(w => w.name === name && w.chains.some(c => c.startsWith(`${chainPrefix}:`)))
}

/**
 * Get the raw Wallet Standard API for event subscriptions.
 * Use walletsApi.on('register', callback) to listen for new wallets.
 */
export const getWalletStandardStore = () => walletsApi
