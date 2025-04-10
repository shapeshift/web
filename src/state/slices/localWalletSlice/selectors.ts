import { createSelector } from '@reduxjs/toolkit'

import { localWalletSlice } from './localWalletSlice'

import type { KeyManager } from '@/context/WalletProvider/KeyManager'

const selectLocalWalletState = localWalletSlice.selectSlice

export const selectWalletType = createSelector(
  selectLocalWalletState,
  (localWalletState): KeyManager | null => localWalletState.walletType,
)

export const selectWalletDeviceId = createSelector(
  selectLocalWalletState,
  (localWalletState): string | null => localWalletState.walletDeviceId,
)

export const selectNativeWalletName = createSelector(
  selectLocalWalletState,
  (localWalletState): string | null => localWalletState.nativeWalletName,
)
export const selectWalletRdns = createSelector(
  selectLocalWalletState,
  (localWalletState): string | null => localWalletState.rdns,
)
