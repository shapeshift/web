import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { KeyManager } from 'context/WalletProvider/KeyManager'

export type LocalWalletState = {
  walletType: KeyManager | null
  walletDeviceId: string | null
  nativeWalletName: string | null
}

const initialState: LocalWalletState = {
  walletType: null,
  walletDeviceId: null,
  nativeWalletName: null,
}

export const localWalletSlice = createSlice({
  name: 'localWallet',
  initialState,
  reducers: {
    clear: () => initialState,
    setLocalWallet: (state, action: PayloadAction<{ type: KeyManager; deviceId: string }>) => {
      state.walletType = action.payload.type
      state.walletDeviceId = action.payload.deviceId
    },
    clearLocalWallet: state => {
      state.walletType = null
      state.walletDeviceId = null
      state.nativeWalletName = null
    },
    setNativeWalletName: (state, action: PayloadAction<string>) => {
      state.nativeWalletName = action.payload
    },
  },
})
