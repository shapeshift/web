import { Alert, AlertDescription, AlertIcon, Button } from '@chakra-ui/react'
import type { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import type { Event, HDWalletError } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useState } from 'react'
import { Route, Switch } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { KeepKeyConfig } from 'context/WalletProvider/KeepKey/config'
import { FailureType, MessageType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'
import { setupKeepKeySDK } from 'context/WalletProvider/KeepKey/setupKeepKeySdk'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { useWallet } from 'hooks/useWallet/useWallet'

import { PairBody } from '../components/PairBody'

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
  const { dispatch, getAdapter, state } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (!wallet) return
    try {
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
  }, [dispatch, getAdapter, localWallet, setErrorLoading, state.keyring])

  const secondaryContent = error === 'walletProvider.errors.walletNotFound' && (
    <>
      <Alert status='error'>
        <AlertIcon />
        <AlertDescription>
          <Text translation={'walletProvider.keepKey.errors.updateAlert'} />
        </AlertDescription>
      </Alert>
      <Button width='full' onClick={handleDownloadButtonClick} colorScheme='blue'>
        <Text translation={'walletProvider.keepKey.connect.downloadUpdaterApp'} />
      </Button>
    </>
  )

  // Note, `/keepkey/connect` is handled with PairBody instead of the regular KK routes, since it's the new, better looking version
  const keepKeyRoutes = SUPPORTED_WALLETS[KeyManager.KeepKey].routes.map(route => {
    const Component = route.component
    return !Component ? null : (
      <Route
        exact
        key={'route'}
        path={route.path}
        // we need to pass an arg here, so we need an anonymous function wrapper
        // eslint-disable-next-line react-memo/require-usememo
        render={routeProps => <Component {...routeProps} />}
      />
    )
  })

  return (
    <Switch>
      <Route path='/keepkey/connect'>
        <PairBody
          icon={icon}
          headerTranslation='walletProvider.keepKey.connect.header'
          bodyTranslation='walletProvider.keepKey.connect.body'
          buttonTranslation='walletProvider.keepKey.connect.button'
          isLoading={loading}
          error={error}
          onPairDeviceClick={pairDevice}
          secondaryContent={secondaryContent}
        />
      </Route>
      {keepKeyRoutes}
    </Switch>
  )
}