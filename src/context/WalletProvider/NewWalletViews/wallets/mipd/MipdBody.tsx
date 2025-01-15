import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Flex,
  Image,
  Spinner,
  Text as CText,
} from '@chakra-ui/react'
import { getConfig } from 'config'
import { useCallback, useMemo } from 'react'
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
import { useMipdProviders } from 'lib/mipd'

type MipdBodyProps = {
  rdns: string
  loading: boolean
  error: string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const MipdBody = ({ rdns, loading, error, setLoading, setError }: MipdBodyProps) => {
  const translate = useTranslate()
  const mipdProviders = useMipdProviders()
  const history = useHistory()
  const maybeMipdProvider = useMemo(
    () => mipdProviders.find(provider => provider.info.rdns === rdns),
    [mipdProviders, rdns],
  )

  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const pairDevice = useCallback(async () => {
    setError(null)
    setLoading(true)

    const adapter = await getAdapter(KeyManager.MetaMask)
    if (!adapter) {
      setLoading(false)
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
        const isMetaMaskMobileWebView = checkIsMetaMaskMobileWebView()

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
        history.push('/metamask/failure')
      }
    }
    setLoading(false)
  }, [
    dispatch,
    getAdapter,
    history,
    localWallet,
    maybeMipdProvider?.info.name,
    maybeMipdProvider?.info.rdns,
    setError,
    setLoading,
    translate,
  ])

  if (!maybeMipdProvider) return null

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <Image src={maybeMipdProvider.info.icon} boxSize='64px' />
      <CText fontSize='xl'>Pair {maybeMipdProvider.info.name}</CText>
      <Text
        color='gray.500'
        translation={['walletProvider.mipd.connect.body', { name: maybeMipdProvider.info.name }]}
        textAlign='center'
      />

      {error && (
        <Alert status='info'>
          <AlertIcon />
          <AlertDescription>
            <Text translation={error} />
          </AlertDescription>
        </Alert>
      )}

      <Button
        width='200px'
        colorScheme='blue'
        isLoading={loading}
        loadingText='Pairing'
        spinner={<Spinner color='white' />}
        onClick={pairDevice}
        data-test='wallet-pair-button'
      >
        {translate('walletProvider.mipd.connect.button')}
      </Button>
    </Flex>
  )
}
