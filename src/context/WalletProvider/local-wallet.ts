import type { KeyManager } from './KeyManager'

import { localWallet } from '@/state/slices/localWalletSlice/localWalletSlice'
import {
  selectNativeWalletName,
  selectWalletDeviceId,
  selectWalletRdns,
  selectWalletType,
} from '@/state/slices/localWalletSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useLocalWallet = () => {
  const dispatch = useAppDispatch()

  const setLocalWallet = ({
    type,
    deviceId,
    rdns,
  }: {
    type: KeyManager
    deviceId: string
    rdns?: string | null
  }) => {
    dispatch(localWallet.actions.setLocalWallet({ type, deviceId, rdns: rdns ?? null }))
  }

  const clearLocalWallet = () => {
    dispatch(localWallet.actions.clearLocalWallet())
  }
  const setLocalNativeWalletName = (name: string) => {
    dispatch(localWallet.actions.setNativeWalletName(name))
  }
  const nativeLocalWalletName = useAppSelector(selectNativeWalletName)
  const localWalletType = useAppSelector(selectWalletType)
  const localWalletDeviceId = useAppSelector(selectWalletDeviceId)
  const rdns = useAppSelector(selectWalletRdns)

  return {
    setLocalWallet,
    clearLocalWallet,
    setLocalNativeWalletName,
    nativeLocalWalletName,
    localWalletType,
    localWalletDeviceId,
    rdns,
  }
}
