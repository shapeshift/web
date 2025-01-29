import { createSelector } from '@reduxjs/toolkit'
import type { KeyManager } from 'context/WalletProvider/KeyManager'
import type { ReduxState } from 'state/reducer' // Adjust the import path as needed

const selectLocalWalletState = (state: ReduxState) => state.localWalletSlice

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
