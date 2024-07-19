import type { Modals } from './types'

export const OPEN_MODAL = 'OPEN_MODAL'
export const CLOSE_MODAL = 'CLOSE_MODAL'

export const MODAL_KEYS: (keyof Modals)[] = [
  'receive',
  'qrCode',
  'send',
  'fiatRamps',
  'settings',
  'keepKeyWipe',
  'backupNativePassphrase',
  'mobileWelcomeModal',
  'addAccount',
  'assetSearch',
  'buyAssetSearch',
  'sellAssetSearch',
  'buyTradeAssetSearch',
  'sellTradeAssetSearch',
  'popup',
  'nativeOnboard',
  'nft',
  'feedbackSupport',
  'snaps',
  'manageAccounts',
  'ledgerOpenApp',
]
