import { KeyManager } from '../KeyManager'

// Map RDNSes to their first-class KeyManager implementation
export const RDNS_TO_FIRST_CLASS: Record<string, KeyManager> = {
  'app.phantom': KeyManager.Phantom,
  'app.keplr': KeyManager.Keplr,
  'com.coinbase.wallet': KeyManager.Coinbase,
} as const
