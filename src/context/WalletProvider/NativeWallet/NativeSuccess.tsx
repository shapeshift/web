import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { Card } from 'components/Card'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { useEffect, useState } from 'react'

import { SUPPORTED_WALLETS } from '../config'
import { useWallet, WalletActions } from '../WalletProvider'
import { NativeSetupProps } from './setup'

export const NativeSuccess = ({ location }: NativeSetupProps) => {
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
          dispatch({ type: WalletActions.SET_WALLET, payload: wallet })
          const { name, icon } = SUPPORTED_WALLETS['native']
          dispatch({ type: WalletActions.SET_WALLET_INFO, payload: { name, icon } })
        } catch (error) {
          console.warn('Failed to load device', error)
          setIsSuccessful(false)
        }
      } else {
        setIsSuccessful(false)
      }
    })()
  }, [dispatch, location.state, setLocalStorageWallet, state.adapters])

  return (
    <>
      <ModalHeader>Wallet Connected</ModalHeader>
      <ModalBody>
        <Card mb={4}>
          <Card.Body fontSize='sm'>
            {isSuccessful === true ? (
              'Your wallet has been connected'
            ) : isSuccessful === false ? (
              'There was an error connecting your wallet'
            ) : (
              <Spinner />
            )}
          </Card.Body>
        </Card>
      </ModalBody>
    </>
  )
}
