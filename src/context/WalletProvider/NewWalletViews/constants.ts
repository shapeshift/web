import invert from 'lodash/invert'

import { KeyManager } from '../KeyManager'

import { getConfig } from '@/config'

// Map RDNSes to their first-class KeyManager implementation
export const RDNS_TO_FIRST_CLASS_KEYMANAGER: Record<string, KeyManager> = {
  'app.phantom': KeyManager.Phantom,
  'app.keplr': KeyManager.Keplr,
  'com.coinbase.wallet': KeyManager.Coinbase,
  ...(getConfig().VITE_FEATURE_VULTISIG_WALLET ? { 'me.vultisig': KeyManager.Vultisig } : {}),
} as const

export const FIRST_CLASS_KEYMANAGER_TO_RDNS = invert(RDNS_TO_FIRST_CLASS_KEYMANAGER) as Record<
  KeyManager,
  string
>
