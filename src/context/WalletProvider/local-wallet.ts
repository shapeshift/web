import { localWalletSlice } from 'state/slices/localWalletSlice/localWalletSlice'
import {
  selectNativeWalletName,
  selectWalletDeviceId,
  selectWalletType,
} from 'state/slices/localWalletSlice/selectors'
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
  const nativeLocalWalletName = useAppSelector(selectNativeWalletName)
  const localWalletType = useAppSelector(selectWalletType)
  const localWalletDeviceId = useAppSelector(selectWalletDeviceId)

  return {
    setLocalWalletTypeAndDeviceId,
    clearLocalWallet,
    setLocalNativeWalletName,
    nativeLocalWalletName,
    localWalletType,
    localWalletDeviceId,
  }
}
