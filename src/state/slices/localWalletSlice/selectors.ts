import { createSelector } from '@reduxjs/toolkit'

import { localWalletSlice } from './localWalletSlice'

import type { KeyManager } from '@/context/WalletProvider/KeyManager'

export const selectWalletType = createSelector(
  localWalletSlice.selectSlice,
  (localWalletState): KeyManager | null => {
    console.log('[localWalletSlice] selectWalletType:', { localWalletState })
    return localWalletState.walletType
  },
)

export const selectWalletDeviceId = createSelector(
  localWalletSlice.selectSlice,
  (localWalletState): string | null => localWalletState.walletDeviceId,
)

export const selectNativeWalletName = createSelector(
  localWalletSlice.selectSlice,
  (localWalletState): string | null => localWalletState.nativeWalletName,
)
export const selectWalletRdns = createSelector(
  localWalletSlice.selectSlice,
  (localWalletState): string | null => localWalletState.rdns,
)

export const selectGridPlusPrivKey = createSelector(
  localWalletSlice.selectSlice,
  (localWalletState): string | null => localWalletState.gridplusPrivKey,
)
