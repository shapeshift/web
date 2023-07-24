import { createContext } from 'react'

import type { BaseProps } from './ModalContainer'

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

// testability
export function createModalContext<M>(context?: M) {
  return createContext<M>((context ?? {}) as M)
}

// context
// If initial state is removed/set to null, the KeepKey wallet modals will break
export const InnerModalContext = createModalContext<BaseProps>()
