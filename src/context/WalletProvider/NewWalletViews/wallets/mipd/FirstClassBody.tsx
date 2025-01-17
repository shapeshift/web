import { Alert, AlertDescription, AlertIcon, Button, Flex, Image, Spinner } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import type { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MetaMaskConfig } from 'context/WalletProvider/MetaMask/config'
import { useWallet } from 'hooks/useWallet/useWallet'

const spinner = <Spinner color='white' />

type FirstClassBodyProps = {
  keyManager: KeyManager
  isLoading: boolean
  error: string | null
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const FirstClassBody = ({
  keyManager,
  isLoading,
  error,
  setIsLoading,
  setError,
}: FirstClassBodyProps) => {
  const translate = useTranslate()
  const history = useHistory()

  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const pairDevice = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(keyManager)
    if (!adapter) {
      setIsLoading(false)
      return
    }

    try {
      const wallet = await adapter.pairDevice()
      if (!wallet) {
        setError('walletProvider.errors.walletNotFound')
        throw new Error(
          `Call to hdwallet-${keyManager.toLowerCase()}::pairDevice returned null or undefined`,
        )
      }

      const { name, icon } = MetaMaskConfig
      const deviceId = await wallet.getDeviceID()
      const isLocked = await wallet.isLocked()

      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, connectedType: keyManager },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })

      localWallet.setLocalWallet({
        type: keyManager,
        deviceId,
      })
    } catch (e: any) {
      if (e?.message?.startsWith('walletProvider.')) {
        console.error(e)
        setError(e?.message)
      } else {
        console.error(e, `${keyManager} Connect: There was an error initializing the wallet`)
        setError(e.message)
        history.push('/phantom/failure')
      }
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, getAdapter, history, keyManager, localWallet, setError, setIsLoading])

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <Image src={'TODO'} boxSize='64px' />
      <Text
        fontSize='xl'
        translation={`walletProvider.${keyManager.toLowerCase()}.connect.header`}
      />
      <Text
        color='gray.500'
        translation={`walletProvider.${keyManager.toLowerCase()}.connect.body`}
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
        maxW='200px'
        width='100%'
        colorScheme='blue'
        isLoading={isLoading}
        loadingText={translate('common.pairing')}
        spinner={spinner}
        onClick={pairDevice}
      >
        {translate('walletProvider.mipd.connect.button')}
      </Button>
    </Flex>
  )
}
