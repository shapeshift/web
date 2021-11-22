import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader
} from '@chakra-ui/react'
import { Event } from '@shapeshiftoss/hdwallet-core'
import React, { useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import { LocationState } from '../../NativeWallet/types'
import { ActionTypes, useWallet, WalletActions } from '../../WalletProvider'
import { FailureType, MessageType } from '../KeepKeyTypes'

export interface KeepKeySetupProps
  extends RouteComponentProps<
    {},
    any, // history
    LocationState
  > {
  dispatch: React.Dispatch<ActionTypes>
}

const translateError = (event: Event) => {
  let t: string
  // eslint-disable-next-line default-case
  switch (event.message?.code as FailureType) {
    case FailureType.PINCANCELLED:
      t = 'pinCancelled'
      break
    case FailureType.PININVALID:
      t = 'pinInvalid'
      break
    default:
      t = 'unknown'
  }

  return `walletProvider.keepKey.errors.${t}`
}

export const KeepKeyConnect = ({ history }: KeepKeySetupProps) => {
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
    setError(null)
    setLoading(true)
    // if keepkey is connected to another tab, it does not get added to state.adapters.
    if (state.adapters && !state.adapters.has(KeyManager.KeepKey)) {
      setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
      return
    }
    if (state.adapters && state.adapters?.has(KeyManager.KeepKey)) {
      const wallet = await state.adapters
        .get(KeyManager.KeepKey)
        ?.pairDevice()
        .catch(err => {
          if (err.name === 'ConflictingApp') {
            setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
            return
          }
          console.error('KeepKey Connect: There was an error initializing the wallet', err)
          setErrorLoading('walletProvider.errors.walletNotFound')
          return
        })
      if (!wallet) {
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }

      const { name, icon } = SUPPORTED_WALLETS[KeyManager.KeepKey]
      try {
        const deviceId = await wallet.getDeviceID()
        state.keyring.on(['KeepKey', deviceId, '*'], (e: [deviceId: string, event: Event]) => {
          if (e[1].message_enum === MessageType.FAILURE) {
            setErrorLoading(translateError(e[1]))
          }
        })

        await wallet.initialize()

        dispatch({
          type: WalletActions.SET_WALLET,
          payload: { wallet, name, icon, deviceId }
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        history.push('/keepkey/success')
      } catch (e) {
        console.error('KeepKey Connect: There was an error initializing the wallet', e)
        setErrorLoading('walletProvider.keepKey.errors.unknown')
      }
    }
    setLoading(false)
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.keepKey.connect.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={'walletProvider.keepKey.connect.body'} />
        <Button isFullWidth colorScheme='blue' onClick={pairDevice} disabled={loading}>
          {loading ? (
            <CircularProgress size='5' />
          ) : (
            <Text translation={'walletProvider.keepKey.connect.button'} />
          )}
        </Button>
        {error && (
          <Alert status='info' mt={4}>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
      </ModalBody>
    </>
  )
}
