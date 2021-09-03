import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'
import { Card } from 'components/Card'
import { Text } from 'components/Text'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { useEffect, useState } from 'react'

import { useWallet, WalletActions } from '../WalletProvider'
import { WalletViewProps } from '../WalletViewsRouter'
import { NativeSetupProps } from './setup'

export const NativeSuccess = ({ location }: NativeSetupProps & WalletViewProps) => {
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
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeSuccess.header'} />
      </ModalHeader>
      <ModalBody>
        <Card mb={4}>
          <Card.Body fontSize='sm'>
            {isSuccessful === true ? (
              <Text translation={'walletProvider.shapeShift.nativeSuccess.success'} />
            ) : isSuccessful === false ? (
              <Text translation={'walletProvider.shapeShift.nativeSuccess.error'} />
            ) : (
              <Spinner />
            )}
          </Card.Body>
        </Card>
      </ModalBody>
    </>
  )
}
