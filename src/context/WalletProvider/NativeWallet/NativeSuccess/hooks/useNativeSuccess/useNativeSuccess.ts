import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { useEffect, useState } from 'react'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { NativeSetupProps } from 'context/WalletProvider/NativeWallet/setup'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'

export type UseNativeSuccessPropTypes = Partial<NativeSetupProps>

export const useNativeSuccess = ({ location }: NativeSetupProps) => {
  const [isSuccessful, setIsSuccessful] = useState<boolean | null>(null)
  const [, setLocalStorageWallet] = useLocalStorage<Record<string, string>>('wallet', null)
  const { state, dispatch } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (location.state.encryptedWallet?.encryptedWallet && state.adapters?.native) {
        try {
          let mnemonic = await location.state.encryptedWallet.decrypt()
          const wallet = await (state.adapters.native as NativeAdapter).pairDevice(
            location.state.encryptedWallet.deviceId
          )
          await wallet?.loadDevice({ mnemonic })
          mnemonic = '' // Clear out the mnemonic as soon as we're done with it
          setLocalStorageWallet({
            [location.state.encryptedWallet.deviceId]:
              location.state.encryptedWallet.encryptedWallet
          })
          setIsSuccessful(true)
          const { name, icon } = SUPPORTED_WALLETS['native']
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId: location.state.encryptedWallet.deviceId }
          })
        } catch (error) {
          console.warn('Failed to load device', error)
          setIsSuccessful(false)
        }
      } else {
        setIsSuccessful(false)
      }
    })()
  }, [dispatch, location.state, setLocalStorageWallet, state.adapters])

  return { isSuccessful }
}
