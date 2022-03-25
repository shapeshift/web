import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader
} from '@chakra-ui/react'
import { Event } from '@shapeshiftoss/hdwallet-core'
import { ipcRenderer } from 'electron'
import React, { useCallback, useEffect, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'

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
  const { dispatch, state, connect } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { initialize } = useModal()
  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)
    if (state.adapters && !state.adapters.has(KeyManager.KeepKey)) {
      // if keepkey is connected to another tab, it does not get added to state.adapters.
      setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
      return
    }
    if (state.adapters && state.adapters?.has(KeyManager.KeepKey)) {
      const wallet = await state.adapters
        .get(KeyManager.KeepKey)
        ?.pairDevice('http://localhost:1646')
        .catch(err => {
          console.error('conflict err', err)
          if (err.name === 'ConflictingApp') {
            setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
            return
          }
          console.error('KeepKey Connect: There was an error initializing the wallet', err)
          setErrorLoading('walletProvider.errors.walletNotFound')
          return
        })
      if (!wallet) {
        console.error('wallet not found!')
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }

      const { name, icon } = SUPPORTED_WALLETS[KeyManager.KeepKey]
      try {
        const deviceId = await wallet.getDeviceID()
        // This gets the firmware version needed for some KeepKey "supportsX" functions
        let features = await wallet.getFeatures()
        ipcRenderer.send('@keepkey/info', features)
        if (!features.initialized) {
          initialize.open({})
        } else {
          // Show the label from the wallet instead of a generic name
          const label = (await wallet.getLabel()) || name
          state.keyring.on(['KeepKey', deviceId, '*'], (e: [deviceId: string, event: Event]) => {
            if (e[1].message_enum === MessageType.FAILURE) {
              setErrorLoading(translateError(e[1]))
            }
          })
          await wallet.initialize()

          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name: label, icon, deviceId, meta: { label } }
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          /**
           * The real deviceId of KeepKey wallet could be different from the
           * deviceId recieved from the wallet, so we need to keep
           * aliases[deviceId] in the local wallet storage.
           */
          setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.getAlias(deviceId))
          history.push('/keepkey/success')
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name: label, icon, deviceId, meta: { label } }
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          /**
           * The real deviceId of KeepKey wallet could be different from the
           * deviceId recieved from the wallet, so we need to keep
           * aliases[deviceId] in the local wallet storage.
           */
          setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.aliases[deviceId])
          history.push('/keepkey/success')
        }
      } catch (e) {
        console.error('KeepKey Connect: There was an error initializing the wallet', e)
        setErrorLoading('walletProvider.keepKey.errors.unknown')
      }
    }
    setLoading(false)
  }, [state.adapters, dispatch, history, initialize, state.keyring])

  useEffect(() => {
    let tries = 0
    ipcRenderer.removeAllListeners('@bridge/running')
    ipcRenderer.removeAllListeners('@bridge/start')
    ipcRenderer.on('@bridge/running', async (event, bridgeRunning) => {
      if (tries > 0) {
        setLoading(false)
        setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
        return (tries = 0)
      }
      tries++

      if (!bridgeRunning) {
        ipcRenderer.send('@bridge/start')
      } else {
        await connect(KeyManager.KeepKey)
        ipcRenderer.removeAllListeners('@bridge/running')
        ipcRenderer.removeAllListeners('@bridge/start')
        pairDevice()
        return (tries = 0)
      }
    })

    ipcRenderer.on('@bridge/start', async (event, data) => {
      ipcRenderer.send('@bridge/running')
    })
  }, [pairDevice, connect])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.keepKey.connect.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={'walletProvider.keepKey.connect.body'} />

        <Button
          isFullWidth
          colorScheme='blue'
          onClick={() => {
            ipcRenderer.send('@bridge/running')
            setLoading(true)
          }}
          disabled={loading}
        >
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
