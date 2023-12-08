import { localWalletSlice } from 'state/slices/localWalletSlice/localWalletSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import type { KeyManager } from './KeyManager'

export const useLocalWallet = () => {
  const dispatch = useAppDispatch()

  const setLocalWalletTypeAndDeviceId = (type: KeyManager, deviceId: string) => {
    dispatch(localWalletSlice.actions.setWalletTypeAndDeviceId({ type, deviceId }))
  }

  const clearLocalWallet = () => {
    dispatch(localWalletSlice.actions.clearLocalWallet())
  }
  const setLocalNativeWalletName = (name: string) => {
    dispatch(localWalletSlice.actions.setNativeWalletName(name))
  }
  const nativeLocalWalletName = useAppSelector(state => state.localWalletSlice.nativeWalletName)
  const localWalletType = useAppSelector(state => state.localWalletSlice.walletType)
  const localWalletDeviceId = useAppSelector(state => state.localWalletSlice.walletDeviceId)

  return {
    setLocalWalletTypeAndDeviceId,
    clearLocalWallet,
    setLocalNativeWalletName,
    nativeLocalWalletName,
    localWalletType,
    localWalletDeviceId,
  }
}
