import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import type { Event } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useState } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { setLocalWalletTypeAndDeviceId } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { KeepKeyConfig } from '../config'
import { FailureType, MessageType } from '../KeepKeyTypes'
import { setupKeepKeySDK } from '../setupKeepKeySdk'

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

  const handleDownloadButtonClick = useCallback(() => {
    dispatch({ type: WalletActions.DOWNLOAD_UPDATER, payload: false })
  }, [dispatch])

  const pairDevice = async () => {
    setError(null)
    setLoading(true)
    if (state.adapters) {
      const adapters = state.adapters.get(KeyManager.KeepKey)
      if (!adapters) return
      const wallet = await (async () => {
        try {
          const sdk = await setupKeepKeySDK()
          const wallet = await adapters[0]?.pairDevice(sdk)
          if (!wallet) {
            setErrorLoading('walletProvider.errors.walletNotFound')
            return
          }
          return wallet
        } catch (e) {
          const wallet = await adapters[1]?.pairDevice().catch(err => {
            if (err.name === 'ConflictingApp') {
              setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
              return
            }
            console.error(e)
            setErrorLoading('walletProvider.errors.walletNotFound')
            return
          })
          if (!wallet) {
            setErrorLoading('walletProvider.errors.walletNotFound')
            return
          }
          return wallet
        }
      })()
      if (!wallet) return
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
          payload: {
            wallet,
            name,
            icon,
            deviceId,
            meta: { label },
            connectedType: KeyManager.KeepKey,
          },
        })
        dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
        /**
         * The real deviceId of KeepKey wallet could be different from the
         * deviceId received from the wallet, so we need to keep
         * aliases[deviceId] in the local wallet storage.
         */
        setLocalWalletTypeAndDeviceId(KeyManager.KeepKey, state.keyring.getAlias(deviceId))
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      } catch (e) {
        console.error(e)
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
        <Text mb={4} color='text.subtle' translation={'walletProvider.keepKey.connect.body'} />
        <Button width='full' colorScheme='blue' onClick={pairDevice} isDisabled={loading}>
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
        {error === 'walletProvider.errors.walletNotFound' && (
          <>
            <Alert status='error' mt={4}>
              <AlertIcon />
              <AlertDescription>
                <Text translation={'walletProvider.keepKey.errors.updateAlert'} />
              </AlertDescription>
            </Alert>
            <Button width='full' onClick={handleDownloadButtonClick} colorScheme='blue' mt={4}>
              <Text translation={'walletProvider.keepKey.connect.downloadUpdaterApp'} />
            </Button>
          </>
        )}
      </ModalBody>
    </>
  )
}
