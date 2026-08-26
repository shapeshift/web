import { Flex } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { Event, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { HDWalletErrorType } from '@shapeshiftoss/hdwallet-core'
import type { WebUSBKeepKeyAdapter } from '@shapeshiftoss/hdwallet-keepkey-webusb'
import { useMutation } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { PairBody } from '../components/PairBody'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeepKeyConfig } from '@/context/WalletProvider/KeepKey/config'
import { isHDWalletErrorType } from '@/context/WalletProvider/KeepKey/helpers'
import { useKeepKeyVersions } from '@/context/WalletProvider/KeepKey/hooks/useKeepKeyVersions'
import { FailureType, MessageType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { setupKeepKeySDK } from '@/context/WalletProvider/KeepKey/setupKeepKeySdk'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { KeepKeyRoutes as KeepKeyRoutesEnum } from '@/context/WalletProvider/routes'
import { useWallet } from '@/hooks/useWallet/useWallet'

const Icon = KeepKeyConfig.icon
const icon = <Icon boxSize='64px' />

type KeepKeyWebUsbAdapter = InstanceType<typeof WebUSBKeepKeyAdapter>

const PAIRING_TIMEOUT_MS = 15_000

const routeFallback = (
  <Flex width='full' height='full' alignItems='center' justifyContent='center'>
    <CircularProgress />
  </Flex>
)

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
  const [isPairing, setIsPairing] = useState(false)
  const { deviceFirmwareQuery } = useKeepKeyVersions({ wallet })
  const location = useLocation()

  const setErrorLoading = useCallback((e: string | null) => {
    setError(e)
    setIsPairing(false)
  }, [])

  // This... well, pairs KK, but we still need to initialize it later on as a side-effect
  const pairKeepKeyHdWallet = useCallback(async () => {
    setError(null)
    setIsPairing(true)

    const wallet: HDWallet | undefined = await (async () => {
      try {
        const sdk = await setupKeepKeySDK()
        if (sdk) {
          const firstAdapter = (await getAdapter(KeyManager.KeepKey)) as KkRestAdapter | null
          return await firstAdapter?.pairDevice(sdk)
        } else {
          const secondAdapter = (await getAdapter(
            KeyManager.KeepKey,
            1,
          )) as KeepKeyWebUsbAdapter | null

          const existingDevices = await secondAdapter?.getDevices()

          if (existingDevices?.length) {
            return await secondAdapter?.pairRawDevice(existingDevices[0])
          }

          return await secondAdapter?.pairDevice()
        }
      } catch (err) {
        console.error(err)
        if (isHDWalletErrorType(err, HDWalletErrorType.ConflictingApp)) {
          setErrorLoading('walletProvider.keepKey.connect.conflictingApp')
          return
        }
        // Below 6.1.0 the usb interface reports as a protected class and cannot be claimed
        if (isHDWalletErrorType(err, HDWalletErrorType.FirmwareUpdateRequired)) {
          dispatch({ type: WalletActions.DOWNLOAD_UPDATER })
          return
        }
        setErrorLoading('walletProvider.errors.walletNotFound')
        return
      }
    })()

    if (!wallet) setIsPairing(false)

    setWallet(wallet || null)
  }, [dispatch, getAdapter, setErrorLoading])

  // Actually initializes KK once hdwallet is paired
  const initializeKeepKeyMutation = useMutation({
    mutationFn: async () => {
      if (!wallet) throw new Error('No wallet available')

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
      const isLocked = await wallet.isLocked()

      return {
        wallet,
        name,
        icon,
        deviceId,
        label,
        isLocked,
      }
    },
    onSuccess: data => {
      const { wallet, name, icon, deviceId, label, isLocked } = data

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

      if (isLocked) return

      setIsPairing(false)
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    },
    onError: (e: Error) => {
      console.error(e)
      setErrorLoading(e.message || 'walletProvider.keepKey.errors.unknown')
    },
  })

  // Pairing can stall with nothing thrown, leaving the spinner running with no way out
  useEffect(() => {
    if (!isPairing) return
    if (location.pathname !== KeepKeyRoutesEnum.Connect) return

    const timeout = setTimeout(
      () => setErrorLoading('walletProvider.keepKey.connect.timeout'),
      PAIRING_TIMEOUT_MS,
    )

    return () => clearTimeout(timeout)
  }, [isPairing, location.pathname, setErrorLoading])

  // Fires the mutation when we're ready
  useEffect(() => {
    if (!wallet) return
    // A device that cannot be read would otherwise sit on the pair view with nothing shown
    if (deviceFirmwareQuery.isError) {
      setErrorLoading('walletProvider.errors.walletNotFound')
      return
    }
    // Only the device is a prerequisite, the manifest is fetched from a third party
    if (!deviceFirmwareQuery.data) return

    initializeKeepKeyMutation.mutate()
    // Don't memoize initializeKeepKeyMutation or this will run in an infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wallet,
    deviceFirmwareQuery.data,
    deviceFirmwareQuery.isError,
    setErrorLoading,
    initializeKeepKeyMutation.mutate,
  ])

  const pairBodyElement = useMemo(
    () => (
      <PairBody
        icon={icon}
        headerTranslation='walletProvider.keepKey.connect.header'
        bodyTranslation='walletProvider.keepKey.connect.body'
        buttonTranslation='walletProvider.keepKey.connect.button'
        isLoading={
          isPairing || initializeKeepKeyMutation.isPending || deviceFirmwareQuery.isLoading
        }
        error={error}
        onPairDeviceClick={pairKeepKeyHdWallet}
      />
    ),
    [
      isPairing,
      initializeKeepKeyMutation.isPending,
      deviceFirmwareQuery.isLoading,
      error,
      pairKeepKeyHdWallet,
    ],
  )

  // /keepkey/connect is declared below with PairBody, so its config entry carries no component
  const walletRoutes = SUPPORTED_WALLETS[KeyManager.KeepKey].routes
  const keepKeyRoutes = useMemo(
    () =>
      walletRoutes.flatMap(route => {
        const Component = route.component
        if (!Component) return []

        // Above this, suspending would hide us, tearing down the effects mid-handshake
        return [
          <Route
            key={route.path}
            path={route.path}
            element={
              <Suspense fallback={routeFallback}>
                <Component />
              </Suspense>
            }
          />,
        ]
      }),
    [walletRoutes],
  )

  return (
    <Routes>
      <Route path='/keepkey/connect' element={pairBodyElement} />
      {keepKeyRoutes}
    </Routes>
  )
}
