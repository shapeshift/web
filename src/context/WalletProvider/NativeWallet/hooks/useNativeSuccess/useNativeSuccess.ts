import { EncryptedWallet } from '@shapeshiftoss/hdwallet-native/dist/crypto'
import { useEffect } from 'react'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

export type UseNativeSuccessPropTypes = { encryptedWallet?: EncryptedWallet }

export const useNativeSuccess = ({ encryptedWallet }: UseNativeSuccessPropTypes) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const [, setLocalStorageWallet] = useLocalStorage<Record<string, string>>('wallet', null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (
        encryptedWallet?.encryptedWallet &&
        state.adapters &&
        state.adapters.has(KeyManager.Native)
      ) {
        try {
          const adapter = state.adapters.get(KeyManager.Native)
          if (!adapter) throw new Error('Native Adapter is not available')

          let mnemonic = await encryptedWallet.decrypt()
          const deviceId = encryptedWallet.deviceId
          if (!deviceId) {
            throw new Error('useNativeSuccess no deviceId available')
          }
          const wallet = await adapter.pairDevice(deviceId)
          await wallet?.loadDevice({ mnemonic })
          mnemonic = '' // Clear out the mnemonic as soon as we're done with it
          setLocalStorageWallet({
            [encryptedWallet.deviceId]: encryptedWallet.encryptedWallet
          })
          const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId: encryptedWallet.deviceId }
          })
          setIsSuccessful(true)
        } catch (error) {
          console.error('Failed to load device', error)
          setIsSuccessful(false)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encryptedWallet?.encryptedWallet])

  return { isSuccessful }
}
