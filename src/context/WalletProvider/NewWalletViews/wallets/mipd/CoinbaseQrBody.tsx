import { Alert, AlertDescription, AlertIcon, Button, Flex, Spinner } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { CoinbaseIcon } from '@/components/Icons/CoinbaseIcon'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { CoinbaseConfig } from '@/context/WalletProvider/Coinbase/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const spinner = <Spinner color='white' />

type CoinbaseQrBodyProps = {
  isLoading: boolean
  error: string | null
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const CoinbaseQrBody = ({
  isLoading,
  error,
  setIsLoading,
  setError,
}: CoinbaseQrBodyProps) => {
  const translate = useTranslate()

  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const pairDevice = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    const adapter = await getAdapter(KeyManager.Coinbase)
    if (!adapter) {
      setIsLoading(false)
      return
    }

    try {
      const wallet = await adapter.pairDevice()
      if (!wallet) {
        throw new Error('walletProvider.errors.walletNotFound')
      }

      const deviceId = await wallet.getDeviceID()
      const isLocked = await wallet.isLocked()
      await wallet.initialize()

      const { name, icon } = CoinbaseConfig

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name,
          icon,
          deviceId,
          connectedType: KeyManager.Coinbase,
        },
      })
      dispatch({
        type: WalletActions.SET_IS_CONNECTED,
        payload: true,
      })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: isLocked })

      localWallet.setLocalWallet({
        type: KeyManager.Coinbase,
        deviceId,
      })

      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: any) {
      if (e?.message?.startsWith('walletProvider.')) {
        console.error(e)
        setError(e?.message)
      } else {
        console.error(
          e,
          `${KeyManager.Coinbase} Connect: There was an error initializing the wallet`,
        )
        setError(e.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, getAdapter, localWallet, setError, setIsLoading])

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <CoinbaseIcon boxSize='64px' />
      <Text
        fontSize='xl'
        translation={`walletProvider.${KeyManager.Coinbase.toLowerCase()}.connect.header`}
      />
      <Text
        color='gray.500'
        translation={`walletProvider.${KeyManager.Coinbase.toLowerCase()}.connect.body`}
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
