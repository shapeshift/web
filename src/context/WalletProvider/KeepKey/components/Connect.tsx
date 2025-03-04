import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { Event, HDWalletError } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useState } from 'react'
import semverGte from 'semver/functions/gte'

import { KeepKeyConfig } from '../config'
import { useKeepKeyVersions } from '../hooks/useKeepKeyVersions'
import { FailureType, MessageType } from '../KeepKeyTypes'
import { setupKeepKeySDK } from '../setupKeepKeySdk'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

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
  const { dispatch, getAdapter, state } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { versionsQuery } = useKeepKeyVersions({ wallet: state.wallet })
  const latestFirmware = versionsQuery.data?.latestFirmware

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setLoading(false)
  }, [])

  const handleDownloadButtonClick = useCallback(() => {
    dispatch({ type: WalletActions.DOWNLOAD_UPDATER, payload: false })
  }, [dispatch])

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const wallet = await (async () => {
      try {
        const sdk = await setupKeepKeySDK()

        // There is no need to instantiate KkRestAdapter and attempt pairing if SDK is undefined
        // It will only be defined in the context of KK desktop app, and is irrelevant otherwise
        if (sdk) {
          const firstAdapter = (await getAdapter(KeyManager.KeepKey)) as KkRestAdapter | null
          return await firstAdapter?.pairDevice(sdk)
        } else {
          const secondAdapter = await getAdapter(KeyManager.KeepKey, 1)
          // @ts-ignore TODO(gomes): FIXME, most likely borked because of WebUSBKeepKeyAdapter
          return await secondAdapter?.pairDevice()
        }
      } catch (err) {
        console.error(err)
        if ((err as HDWalletError).name === 'ConflictingApp') {
          setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
          return
        }

        console.error(err)
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }
    })()

    if (!wallet) return
    try {
      // Check firmware version before proceeding
      const deviceFirmware = await wallet.getFirmwareVersion()

      // If we're still loading the latest firmware version, wait
      if (versionsQuery.isFetching) {
        console.log('Still loading latest firmware version, waiting...')
        setLoading(true)
        return
      }

      // If the latest firmware version is not available, proceed anyway
      if (!latestFirmware) {
        console.warn('Latest firmware version not available, proceeding anyway')
      } else if (!semverGte(deviceFirmware, latestFirmware)) {
        // If the device firmware is older than the required firmware version, show error and return
        console.error(`Firmware version ${deviceFirmware} is older than required ${latestFirmware}`)
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }

      const { name, icon } = KeepKeyConfig
      const deviceId = await wallet.getDeviceID()
      await wallet.getFeatures()
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
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      localWallet.setLocalWallet({
        type: KeyManager.KeepKey,
        deviceId: state.keyring.getAlias(deviceId),
      })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e) {
      console.error(e)
      setErrorLoading('walletProvider.keepKey.errors.unknown')
    }

    setLoading(false)
  }, [
    dispatch,
    getAdapter,
    localWallet,
    setErrorLoading,
    state.keyring,
    latestFirmware,
    versionsQuery.isFetching,
  ])
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
                <Text
                  translation={[
                    'walletProvider.keepKey.errors.updateAlert',
                    { version: latestFirmware },
                  ]}
                />
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
