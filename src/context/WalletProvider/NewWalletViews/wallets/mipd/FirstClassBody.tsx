import { Alert, AlertDescription, AlertIcon, Button, Flex, Image, Spinner } from '@chakra-ui/react'
import type { MetaMaskAdapter } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { FIRST_CLASS_KEYMANAGER_TO_RDNS } from '../../constants'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'

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

  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const mipdProviders = useMipdProviders()
  // While this component is for fist-class handling, we still want to leverage mipd data (name, icon) instead of our own, to ensure we get latest
  // press kit data from those wallets
  const maybeMipdProvider = mipdProviders.find(
    provider => provider.info.rdns === FIRST_CLASS_KEYMANAGER_TO_RDNS[keyManager],
  )

  const pairDevice = useCallback(async () => {
    if (!maybeMipdProvider) return

    setError(null)
    setIsLoading(true)

    // Just to narrow the types so that PairDevice is defined at type-level, this can currently be a Coinbase/Phantom/Keplr adapter
    const adapter = (await getAdapter(keyManager)) as MetaMaskAdapter | null
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

      const deviceId = await wallet.getDeviceID()
      // Keplr unlock checks are borked
      // And Phantom initial window.phantom?.ethereum._metamask.isUnlocked() returns false despite being unlocked
      // Vultisig has similar issues
      const isLocked = [KeyManager.Keplr, KeyManager.Phantom, KeyManager.Vultisig].includes(
        keyManager,
      )
        ? false
        : await wallet.isLocked()

      await wallet.initialize()

      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name: maybeMipdProvider.info.name,
          icon: maybeMipdProvider.info.icon,
          deviceId,
          connectedType: keyManager,
        },
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

      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: any) {
      if (e?.message?.startsWith('walletProvider.')) {
        console.error(e)
        setError(e?.message)
      } else {
        console.error(e, `${keyManager} Connect: There was an error initializing the wallet`)
        setError(e.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, getAdapter, keyManager, localWallet, maybeMipdProvider, setError, setIsLoading])

  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <Image src={maybeMipdProvider?.info?.icon} boxSize='64px' />
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
