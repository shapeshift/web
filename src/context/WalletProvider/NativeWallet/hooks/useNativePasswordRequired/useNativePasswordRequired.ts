import { useDisclosure } from '@chakra-ui/react'
import { NativeEvents, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect } from 'react'
import { FieldValues, UseFormClearErrors, UseFormSetError } from 'react-hook-form'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

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

  const onSubmit = async (values: FieldValues) => {
    // @TODO: Grab the wallet that emitted the event by deviceId
    try {
      const vault = await Vault.thereCanBeOnlyOne(values.password)
      const deviceId = vault.id
      const maybeWallet: NativeHDWallet | null = state.keyring.get(deviceId)
      if (maybeWallet) {
        maybeWallet.loadDevice({
          mnemonic: await vault.get('#mnemonic'),
          deviceId
        })
        const { name, icon } = SUPPORTED_WALLETS?.[KeyManager.Native]
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
  }

  useEffect(() => {
    const readyCallback = () => {
      clearErrors()
      onClose()
      // safe to non-null assert here as the wallet as emitted a ready event
      const { name, icon } = SUPPORTED_WALLETS?.[KeyManager.Native]
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
