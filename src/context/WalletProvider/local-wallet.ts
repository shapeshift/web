import isEmpty from 'lodash/isEmpty'

import { KeyManager } from './KeyManager'

/**
 * Defining storage up here,
 * so it can be changed to other storage types easily
 */
const storage = {
  set: (key: string, value: string) => localStorage.setItem(key, value),
  get: (key: string) => localStorage.getItem(key),
  remove: (key: string) => localStorage.removeItem(key),
}

const LOCAL_WALLET_TYPE = 'localWalletType'
const LOCAL_WALLET_DEVICE_ID = 'localWalletDeviceId'
const LOCAL_NATIVE_WALLET_NAME = 'localNativeWalletName'

export const setLocalWalletTypeAndDeviceId = (type: KeyManager, deviceId: string) => {
  // If passed invalid data, clear local wallet data
  if (isEmpty(type) || isEmpty(deviceId)) {
    return clearLocalWallet()
  }
  storage.set(LOCAL_WALLET_TYPE, type)
  storage.set(LOCAL_WALLET_DEVICE_ID, deviceId)
}

export const clearLocalWallet = () => {
  storage.remove(LOCAL_WALLET_TYPE)
  storage.remove(LOCAL_WALLET_DEVICE_ID)
  storage.remove(LOCAL_NATIVE_WALLET_NAME)
}

export const getLocalWalletType = () => {
  const type = storage.get(LOCAL_WALLET_TYPE) as KeyManager | null
  if (type && Object.values(KeyManager).includes(type)) return type
  return null
}

export const getLocalWalletDeviceId = () => storage.get(LOCAL_WALLET_DEVICE_ID)

export const setLocalNativeWalletName = (name: string) => {
  storage.set(LOCAL_NATIVE_WALLET_NAME, name)
}

export const getNativeLocalWalletName = () => storage.get(LOCAL_NATIVE_WALLET_NAME)
