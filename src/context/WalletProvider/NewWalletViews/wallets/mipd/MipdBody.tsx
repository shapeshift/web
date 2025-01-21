import { Alert, AlertDescription, AlertIcon, Button, Flex, Image } from '@chakra-ui/react'
import { getConfig } from 'config'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { getSnapVersion } from 'utils/snaps'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MetaMaskConfig } from 'context/WalletProvider/MetaMask/config'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskMobileWebView,
  checkIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from 'hooks/useWallet/useWallet'
import { METAMASK_RDNS, useMipdProviders } from 'lib/mipd'

import { PairBody } from '../../components/PairBody'

type MipdBodyProps = {
  rdns: string
  isLoading: boolean
  error: string | null
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const MipdBody = ({ rdns, isLoading, error, setIsLoading, setError }: MipdBodyProps) => {
  const translate = useTranslate()
  const mipdProviders = useMipdProviders()
  const history = useHistory()
  const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()
  const maybeMipdProvider = useMemo(
    () => mipdProviders.find(provider => provider.info.rdns === rdns),
    [mipdProviders, rdns],
  )

  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const pairDevice = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.MetaMask)
    if (!adapter) {
      setIsLoading(false)
      return
    }

    try {
      const wallet = await adapter.pairDevice()
      if (!wallet) {
        setError('walletProvider.errors.walletNotFound')
        throw new Error(
          'Call to hdwallet-metamask-multichain::pairDevice returned null or undefined',
        )
      }

      const { name, icon } = MetaMaskConfig
      const deviceId = await wallet.getDeviceID()
      const isLocked = await wallet.isLocked()

      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, connectedType: KeyManager.MetaMask },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })

      localWallet.setLocalWallet({
        type: KeyManager.MetaMask,
        deviceId,
        rdns: maybeMipdProvider?.info.rdns,
      })

      await (async () => {
        const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)

        // Wallets other than MM desktop don't support MM snaps
        if (!isMetaMaskDesktop || isMetaMaskMobileWebView)
          return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

        const isSnapInstalled = await checkIsSnapInstalled()
        const snapVersion = await getSnapVersion()
        const isCorrectVersion = snapVersion === getConfig().REACT_APP_SNAP_VERSION

        if (isSnapInstalled && !isCorrectVersion) {
          return history.push('/metamask/snap/update')
        }
        if (!isSnapInstalled) {
          return history.push('/metamask/snap/install')
        }

        return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      })()
    } catch (e: any) {
      if (e?.message?.startsWith('walletProvider.')) {
        console.error(e)
        setError(e?.message)
      } else {
        setError(
          translate('walletProvider.mipd.errors.unknown', {
            name: maybeMipdProvider?.info.name ?? 'MetaMask',
          }),
        )
      }
    }
    setIsLoading(false)
  }, [
    dispatch,
    getAdapter,
    history,
    isMetaMaskMobileWebView,
    localWallet,
    maybeMipdProvider?.info.name,
    maybeMipdProvider?.info.rdns,
    setError,
    setIsLoading,
    translate,
  ])

  const handleMetamaskRedirect = useCallback(() => {
    const METAMASK_DEEP_LINK_BASE_URL = 'https://metamask.app.link'
    // This constructs the MetaMask deep-linking target from the currently-loaded
    // window.location. The port will be blank if not specified, in which case it
    // should be omitted.
    const mmDeeplinkTarget = [window.location.hostname, window.location.port]
      .filter(x => !!x)
      .join(':')
    return window.location.assign(`${METAMASK_DEEP_LINK_BASE_URL}/${mmDeeplinkTarget}`)
  }, [])

  const connectBodyTranslation: [string, InterpolationOptions] = useMemo(
    () => ['walletProvider.mipd.connect.body', { name: maybeMipdProvider?.info.name }],
    [maybeMipdProvider],
  )

  const headerTranslation: [string, InterpolationOptions] = useMemo(
    () => [
      'walletProvider.mipd.connect.header',
      { name: maybeMipdProvider?.info.name ?? 'MetaMask' },
    ],
    [maybeMipdProvider?.info.name],
  )

  const icon = useMemo(
    () => (maybeMipdProvider ? <Image src={maybeMipdProvider.info.icon} boxSize='64px' /> : null),
    [maybeMipdProvider],
  )

  if (!maybeMipdProvider) return null

  if (isMobile && !isMetaMaskMobileWebView && rdns === METAMASK_RDNS) {
    return (
      <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
        <Image src={maybeMipdProvider.info.icon} boxSize='64px' />
        <Text fontSize='xl' translation='walletProvider.metaMask.redirect.header' mb={4} />
        <Text
          color='gray.500'
          translation='walletProvider.metaMask.redirect.body'
          textAlign='center'
          mb={6}
        />
        <Button
          maxW='200px'
          width='100%'
          colorScheme='blue'
          onClick={handleMetamaskRedirect}
          isDisabled={isLoading}
        >
          <Text translation='walletProvider.metaMask.redirect.button' />
        </Button>
        {error && (
          <Alert status='info' mt={4}>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
      </Flex>
    )
  }

  return (
    <PairBody
      icon={icon}
      headerTranslation={headerTranslation}
      bodyTranslation={connectBodyTranslation}
      buttonTranslation='walletProvider.mipd.connect.button'
      isLoading={isLoading}
      error={error}
      onPairDeviceClick={pairDevice}
    />
  )
}
