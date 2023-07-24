import { createContext } from 'react'

export const modalContext: Record<string, React.Context<any>> = [
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
  'popup',
  'nativeOnboard',
  'nft',
  'feedbackSupport',
].reduce((acc, key) => ({ ...acc, [key]: createContext<any>({} as any) }), {})
