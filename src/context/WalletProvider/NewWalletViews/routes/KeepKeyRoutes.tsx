import { Alert, AlertDescription, AlertIcon, Button } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { Event, HDWallet, HDWalletError } from '@shapeshiftoss/hdwallet-core'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import semverGte from 'semver/functions/gte'

import { PairBody } from '../components/PairBody'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeepKeyConfig } from '@/context/WalletProvider/KeepKey/config'
import { useKeepKeyVersions } from '@/context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { FailureType, MessageType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { setupKeepKeySDK } from '@/context/WalletProvider/KeepKey/setupKeepKeySdk'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const Icon = KeepKeyConfig.icon
const icon = <Icon boxSize='64px' />

const translateError = (event: Event) => {
  let t: string
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

export const KeepKeyRoutes = () => {
  // We leverage the hdwallet we just paired here, because we're dealing with react re-renders/closures as well as
  // WebUSB pairing needing to be initiated from a user action
  const [wallet, setWallet] = useState<HDWallet | null>(null)
  const { dispatch, getAdapter, state } = useWallet()
  const localWallet = useLocalWallet()
  const [error, setError] = useState<string | null>(null)
  const { deviceFirmwareQuery, versionsQuery } = useKeepKeyVersions({ wallet })
  const latestFirmware = versionsQuery.data?.latestFirmware

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
  }, [])

  const handleDownloadButtonClick = useCallback(() => {
    dispatch({ type: WalletActions.DOWNLOAD_UPDATER, payload: false })
  }, [dispatch])

  // This... well, pairs KK, but we still need to initialize it later on as a side-effect
  const pairKeepKeyHdWallet = useCallback(async () => {
    setError(null)

    const wallet: HDWallet | undefined = await (async () => {
      try {
        const sdk = await setupKeepKeySDK()
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
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }
    })()

    setWallet(wallet || null)
  }, [getAdapter, setErrorLoading])

  // Actually initializes KK once hdwallet is paired
  const initializeKeepKeyMutation = useMutation({
    mutationFn: async () => {
      if (!wallet) throw new Error('No wallet available')

      // Check firmware version before proceeding
      const deviceFirmware = deviceFirmwareQuery.data

      if (!deviceFirmware) throw new Error('Device firmware data not available')

      // If the latest firmware version is not available, proceed anyway
      if (!latestFirmware) {
        console.warn('Latest firmware version not available, proceeding anyway')
      } else if (!semverGte(deviceFirmware, latestFirmware)) {
        // If the device firmware is older than the required firmware version, show error and throw
        console.error(`Firmware version ${deviceFirmware} is older than required ${latestFirmware}`)
        throw new Error('walletProvider.errors.walletVersionTooOld')
      }

      const { name, icon } = KeepKeyConfig
      const deviceId = await wallet.getDeviceID()
      const label = (await wallet.getLabel()) || name

      // Set up event listener
      state.keyring.on(['KeepKey', deviceId, '*'], (e: [deviceId: string, event: Event]) => {
        if (e[1].message_enum === MessageType.FAILURE) {
          setErrorLoading(translateError(e[1]))
        }
      })

      await wallet.initialize()

      return {
        wallet,
        name,
        icon,
        deviceId,
        label,
      }
    },
    onSuccess: data => {
      const { wallet, name, icon, deviceId, label } = data

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
    },
    onError: (e: Error) => {
      console.error(e)
      setErrorLoading(e.message || 'walletProvider.keepKey.errors.unknown')
    },
  })

  // Fires the mutation when we're ready
  useEffect(() => {
    if (!wallet) return
    if (!deviceFirmwareQuery.data || !versionsQuery.data) return

    initializeKeepKeyMutation.mutate()
    // Don't memoize initializeKeepKeyMutation or this will run in an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, deviceFirmwareQuery.data, versionsQuery.data, initializeKeepKeyMutation.mutate])

  const secondaryContent = useMemo(
    () =>
      error === 'walletProvider.errors.walletVersionTooOld' && (
        <>
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>
              <Text
                // This is already memoized
                translation={[
                  'walletProvider.keepKey.errors.updateAlert',
                  { version: latestFirmware },
                ]}
              />
            </AlertDescription>
          </Alert>
          <Button width='full' onClick={handleDownloadButtonClick} colorScheme='blue'>
            <Text translation={'walletProvider.keepKey.connect.downloadUpdaterApp'} />
          </Button>
        </>
      ),
    [error, handleDownloadButtonClick, latestFirmware],
  )

  const pairBodyElement = useMemo(
    () => (
      <PairBody
        icon={icon}
        headerTranslation='walletProvider.keepKey.connect.header'
        bodyTranslation='walletProvider.keepKey.connect.body'
        buttonTranslation='walletProvider.keepKey.connect.button'
        isLoading={
          initializeKeepKeyMutation.isPending ||
          deviceFirmwareQuery.isLoading ||
          versionsQuery.isLoading
        }
        error={error}
        onPairDeviceClick={pairKeepKeyHdWallet}
        secondaryContent={secondaryContent}
      />
    ),
    [
      initializeKeepKeyMutation.isPending,
      deviceFirmwareQuery.isLoading,
      versionsQuery.isLoading,
      error,
      pairKeepKeyHdWallet,
      secondaryContent,
    ],
  )

  // Note, `/keepkey/connect` is handled with PairBody instead of the regular KK routes, since it's the new, better looking version
  // Use type assertion to tell TypeScript that our routes have the shape we expect
  const walletRoutes = SUPPORTED_WALLETS[KeyManager.KeepKey].routes
  const keepKeyRoutes = useMemo(
    () =>
      walletRoutes
        .filter(route => route.component !== undefined)
        .map(route => <Route key={route.path} path={route.path} element={<route.component />} />),
    [walletRoutes],
  )

  return (
    <Routes>
      <Route path='/keepkey/connect' element={pairBodyElement} />
      {keepKeyRoutes}
    </Routes>
  )
}
