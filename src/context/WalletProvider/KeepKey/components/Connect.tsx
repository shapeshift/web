import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { Event } from '@shapeshiftoss/hdwallet-core'
import { ipcRenderer } from 'electron'
import { useCallback, useEffect, useState } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { KeepKeyConfig } from '../config'
import { FailureType, MessageType } from '../KeepKeyTypes'

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

export const KeepKeyConnect = () => {
  const { dispatch, state, connect } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // const { initialize } = useModal()
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

      const { name, icon } = KeepKeyConfig
      try {
        const deviceId = await wallet.getDeviceID()
        // This gets the firmware version needed for some KeepKey "supportsX" functions
        let features = await wallet.getFeatures()
        ipcRenderer.send('@keepkey/info', features)
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
          payload: { wallet, name: label, icon, deviceId, meta: { label } },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        /**
         * The real deviceId of KeepKey wallet could be different from the
         * deviceId recieved from the wallet, so we need to keep
         * aliases[deviceId] in the local wallet storage.
         */
        setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.getAlias(deviceId))
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        console.error('KeepKey Connect: There was an error initializing the wallet', e)
        setErrorLoading('walletProvider.keepKey.errors.unknown')
      }
    }
    setLoading(false)
  }, [dispatch, state.adapters, state.keyring])

  useEffect(() => {
    let tries = 0
    ipcRenderer.removeAllListeners('@bridge/running')
    ipcRenderer.removeAllListeners('@bridge/start')
    ipcRenderer.on('@bridge/running', async (_event, bridgeRunning) => {
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
    ipcRenderer.on('@bridge/start', async () => {
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
