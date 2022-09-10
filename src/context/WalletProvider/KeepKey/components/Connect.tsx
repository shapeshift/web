import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import type { Event } from '@shapeshiftoss/hdwallet-core'
import { useState } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { KeepKeyConfig } from '../config'
import { FailureType, MessageType } from '../KeepKeyTypes'
const moduleLogger = logger.child({ namespace: ['Connect'] })

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
  const { dispatch, state } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line no-sequences
  const setErrorLoading = (e: string | null) => (setError(e), setLoading(false))

  const pairDevice = async () => {
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
        ?.pairDevice()
        .catch(err => {
          if (err.name === 'ConflictingApp') {
            setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
            return
          }
          moduleLogger.error(err, 'KeepKey Connect: There was an error initializing the wallet')
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
        await wallet.getFeatures()
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
        dispatch({ type: WalletActions.SET_IS_DEMO_WALLET, payload: false })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        /**
         * The real deviceId of KeepKey wallet could be different from the
         * deviceId recieved from the wallet, so we need to keep
         * aliases[deviceId] in the local wallet storage.
         */
        setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.getAlias(deviceId))
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        moduleLogger.error(e, 'KeepKey Connect: There was an error initializing the wallet')
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
        <Button width='full' colorScheme='blue' onClick={pairDevice} disabled={loading}>
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
