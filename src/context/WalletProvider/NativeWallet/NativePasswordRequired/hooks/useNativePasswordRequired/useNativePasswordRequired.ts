import { useDisclosure } from '@chakra-ui/react'
import { NativeEvents, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { getEncryptedWallet } from 'lib/nativeWallet'
import head from 'lodash/head'
import toPairs from 'lodash/toPairs'
import { useState } from 'react'
import { useEffect } from 'react'
import { FieldValues, UseFormClearErrors, UseFormSetError } from 'react-hook-form'

type StoredWallets = Record<string, string>
type useNativePasswordRequiredProps = {
  setError: UseFormSetError<FieldValues>
  clearErrors: UseFormClearErrors<FieldValues>
}
export const useNativePasswordRequired = ({
  setError,
  clearErrors
}: useNativePasswordRequiredProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [wallet, setWallet] = useState<NativeHDWallet | null>(null)
  const { state, dispatch } = useWallet()
  const [localStorageWallet] = useLocalStorage<StoredWallets>('wallet', {})

  const onSubmit = async (values: FieldValues) => {
    // @TODO: Grab the wallet that emitted the event by deviceId
    const storedWallet = localStorageWallet ? head(toPairs(localStorageWallet)) : null
    if (storedWallet) {
      try {
        const [deviceId, encryptedWalletString] = storedWallet
        // @TODO: Replace this encryption with a most robust method
        const encryptedWallet = await getEncryptedWallet(values.password, encryptedWalletString)
        const maybeWallet: NativeHDWallet | null = state.keyring.get(deviceId)
        if (maybeWallet) {
          maybeWallet.loadDevice({
            mnemonic: await encryptedWallet.decrypt(),
            deviceId: encryptedWallet.deviceId
          })
          setWallet(maybeWallet)
        }
      } catch (e) {
        console.error('storedWallets', e)
        setError('password', { message: 'Invalid password' })
      }
    } else {
      clearErrors()
      onClose()
    }
  }

  useEffect(() => {
    if (state.keyring) {
      state.keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], onOpen)
      state.keyring.on(['Native', '*', NativeEvents.READY], () => {
        clearErrors()
        onClose()

        dispatch({ type: WalletActions.SET_WALLET, payload: wallet })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      })
    }
    // We don't want to add a bunch of event listeners by re-rendering this effect
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.keyring, wallet])

  return {
    onSubmit,
    isOpen,
    onClose
  }
}
