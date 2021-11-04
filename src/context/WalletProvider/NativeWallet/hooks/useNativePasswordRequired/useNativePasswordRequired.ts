import { useDisclosure } from '@chakra-ui/react'
import { NativeEvents, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import head from 'lodash/head'
import toPairs from 'lodash/toPairs'
import { useEffect } from 'react'
import { FieldValues, UseFormClearErrors, UseFormSetError } from 'react-hook-form'
import { KeyMananger, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { getEncryptedWallet } from 'lib/nativeWallet'

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
          const { name, icon } = SUPPORTED_WALLETS?.[KeyMananger.Native]
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet: maybeWallet,
              name,
              icon,
              deviceId
            }
          })
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
    const readyCallback = () => {
      clearErrors()
      onClose()
      // safe to non-null assert here as the wallet as emitted a ready event
      const { name, icon } = SUPPORTED_WALLETS?.[KeyMananger.Native]
      // deviceId is an empty string because it will be set onSubmit of the password form.
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet: state.wallet, name, icon, deviceId: state.walletInfo?.deviceId ?? '' }
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
    }

    if (state.keyring) {
      state.keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], onOpen)
      state.keyring.on(['Native', '*', NativeEvents.READY], readyCallback)
    }
    return () => {
      state.keyring.off(NativeEvents.MNEMONIC_REQUIRED, onOpen)
      state.keyring.off(NativeEvents.READY, readyCallback)
    }
    // We don't want to add a bunch of event listeners by re-rendering this effect
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.keyring, state.walletInfo?.deviceId])

  return {
    onSubmit,
    isOpen,
    onClose
  }
}
