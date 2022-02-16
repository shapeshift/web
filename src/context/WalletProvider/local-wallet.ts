import { KeyManager } from './config'
/**
 * Defining storage up here,
 * so it can be changed to other storage types easily
 */
const storage = {
  set: (key: string, value: string) => localStorage.setItem(key, value),
  get: (key: string) => localStorage.getItem(key),
  remove: (key: string) => localStorage.removeItem(key)
}

const LOCAL_WALLET_TYPE_VAR_NAME = 'localWalletType'
const LOCAL_WALLET_DEVICE_ID_VAR_NAME = 'localWalletDeviceId'
const LOCAL_NATIVE_WALLET_NAME_VAR_NAME = 'localNativeWalletName'

export const setLocalWalletTypeAndDeviceId = (type: KeyManager, deviceId: string) => {
  storage.set(LOCAL_WALLET_TYPE_VAR_NAME, type)
  storage.set(LOCAL_WALLET_DEVICE_ID_VAR_NAME, deviceId)
}

export const clearLocalWallet = () => {
  storage.remove(LOCAL_WALLET_TYPE_VAR_NAME)
  storage.remove(LOCAL_WALLET_DEVICE_ID_VAR_NAME)
  storage.remove(LOCAL_NATIVE_WALLET_NAME_VAR_NAME)
}

export const getLocalWalletType = () => {
  const type = storage.get(LOCAL_WALLET_TYPE_VAR_NAME) as KeyManager
  if (type && Object.values(KeyManager).includes(type)) return type
  return null
}

export const getLocalWalletDeviceId = () => storage.get(LOCAL_WALLET_DEVICE_ID_VAR_NAME)

export const setLocalNativeWalletName = (name: string) => {
  storage.set(LOCAL_NATIVE_WALLET_NAME_VAR_NAME, name)
}

export const getNativeLocalWalletName = () => storage.get(LOCAL_NATIVE_WALLET_NAME_VAR_NAME)
