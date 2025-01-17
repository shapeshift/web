import invert from 'lodash/invert'

import { KeyManager } from '../KeyManager'

// Map RDNSes to their first-class KeyManager implementation
export const RDNS_TO_FIRST_CLASS: Record<string, KeyManager> = {
  'app.phantom': KeyManager.Phantom,
  'app.keplr': KeyManager.Keplr,
  'com.coinbase.wallet': KeyManager.Coinbase,
} as const

export const FIRST_CLASS_TO_RDNS = invert(RDNS_TO_FIRST_CLASS) as Record<KeyManager, string>
