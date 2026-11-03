import { Alert, AlertDescription, AlertIcon, Button, Flex, Spinner } from '@chakra-ui/react'
import type { StarknetInjectedErrorCode } from '@shapeshiftoss/hdwallet-starknet-injected'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import type { StarknetInjectedKeyManager } from '../config'

import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const spinner = <Spinner color='white' />

const getErrorCode = (e: unknown): StarknetInjectedErrorCode | undefined =>
  (e as { code?: StarknetInjectedErrorCode } | undefined)?.code

type StarknetInjectedConnectProps = {
  keyManager: StarknetInjectedKeyManager
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const StarknetInjectedConnect = ({
  keyManager,
  isLoading,
  setIsLoading,
}: StarknetInjectedConnectProps) => {
  const translate = useTranslate()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [error, setError] = useState<TextPropTypes['translation']>(null)

  const { name, icon: Icon } = SUPPORTED_WALLETS[keyManager]

  const pairDevice = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const adapter = await getAdapter(keyManager)
      if (!adapter) throw new Error('walletProvider.errors.walletNotFound')

      const wallet = await adapter.pairDevice()
      if (!wallet) throw new Error('walletProvider.errors.walletNotFound')

      const deviceId = await wallet.getDeviceID()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon: Icon, deviceId, connectedType: keyManager },
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      dispatch({ type: WalletActions.SET_IS_LOCKED, payload: false })
      localWallet.setLocalWallet({ type: keyManager, deviceId, rdns: null })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      console.error(e, `${name} Connect: There was an error initializing the wallet`)
      switch (getErrorCode(e)) {
        case 'WRONG_NETWORK':
          setError(['walletProvider.starknetInjected.errors.wrongNetwork', { name }])
          break
        case 'NO_ACCOUNT':
          setError(['walletProvider.starknetInjected.errors.noAccount', { name }])
          break
        default:
          // Most often the user rejected the connection request in the extension
          setError(['walletProvider.starknetInjected.errors.connectionFailed', { name }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, getAdapter, Icon, keyManager, localWallet, name, setIsLoading])

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <Icon boxSize='64px' />
      <Text fontSize='xl' translation={['walletProvider.mipd.connect.header', { name }]} />
      <Text
        color='gray.500'
        translation={['walletProvider.mipd.connect.body', { name }]}
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
