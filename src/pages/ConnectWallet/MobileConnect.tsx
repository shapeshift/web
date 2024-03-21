import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Center,
  Divider,
  Flex,
  Heading,
  Image,
  Stack,
} from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import BlueFox from 'assets/blue-fox.svg'
import GreenFox from 'assets/green-fox.svg'
import OrangeFox from 'assets/orange-fox.svg'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { FadeTransition } from 'components/FadeTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import { getWallet, listWallets } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import { isMobile } from 'lib/globals'

import { WalletCard } from './components/WalletCard'

const containerStyles = { touchAction: 'none' }

export type WalletInfo = {
  id?: string
  name?: string
  createdAt?: number
}

export const MobileConnect = () => {
  const { create, importWallet, dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const translate = useTranslate()
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hideWallets, setHideWallets] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleCreate = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    create(isMobile ? KeyManager.Mobile : KeyManager.Native)
  }, [create, dispatch])

  const handleImport = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    importWallet(isMobile ? KeyManager.Mobile : KeyManager.Native)
  }, [dispatch, importWallet])

  useEffect(() => {
    if (!wallets.length) {
      setIsLoading(true) // Set loading state to true when fetching wallets
      ;(async () => {
        try {
          const vaults = await listWallets()
          if (!vaults.length) {
            setError('walletProvider.shapeShift.load.error.noWallet')
          } else {
            setWallets(vaults)
          }
        } catch (e) {
          console.log(e)
          setError('An error occurred while fetching wallets.')
        } finally {
          setIsLoading(false) // Set loading state to false when fetching is done
        }
      })()
    }
  }, [wallets])

  const handleWalletSelect = useCallback(
    async (item: RevocableWallet) => {
      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = item?.id
      if (adapter && deviceId) {
        const { name, icon } = MobileConfig
        try {
          const revoker = await getWallet(deviceId)
          if (!revoker?.mnemonic) throw new Error(`Mobile wallet not found: ${deviceId}`)
          if (!revoker?.id) throw new Error(`Revoker ID not found: ${deviceId}`)

          // remove all provider event listeners from previously connected wallets
          const ethersProvider = getEthersProvider()
          ethersProvider.removeAllListeners('accountsChanged')
          ethersProvider.removeAllListeners('chainChanged')

          const wallet = await adapter.pairDevice(revoker.id)
          await wallet?.loadDevice({ mnemonic: revoker.mnemonic })
          if (!(await wallet?.isInitialized())) {
            await wallet?.initialize()
          }
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: item.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

          localWallet.setLocalWalletTypeAndDeviceId(KeyManager.Mobile, deviceId)
          localWallet.setLocalNativeWalletName(item?.label ?? 'label')
        } catch (e) {
          console.log(e)
          setError('walletProvider.shapeShift.load.error.pair')
        }
      } else {
        setError('walletProvider.shapeShift.load.error.pair')
      }
    },
    [dispatch, getAdapter, localWallet],
  )

  const handleToggleWallets = useCallback(() => {
    setHideWallets(!hideWallets)
  }, [hideWallets])

  useEffect(() => {
    if (!wallets.length) {
      setHideWallets(true)
    }
  }, [wallets.length])

  const content = useMemo(() => {
    return hideWallets ? (
      <Stack maxWidth='80%' mx='auto' spacing={4} width='full'>
        <Button colorScheme='blue' size='lg' onClick={handleCreate}>
          {translate('connectWalletPage.createANewWallet')}
        </Button>
        <Button variant='outline' size='lg' onClick={handleImport}>
          {translate('connectWalletPage.importExisting')}
        </Button>

        {!!wallets.length && (
          <>
            <Flex gap={2} alignItems='center'>
              <Divider borderColor='border.base' />
              <RawText>{translate('common.or')}</RawText>
              <Divider borderColor='border.base' />
            </Flex>
            <Button variant='outline' size='lg' onClick={handleToggleWallets}>
              {translate('connectWalletPage.viewSavedWallets')}
            </Button>
          </>
        )}
      </Stack>
    ) : (
      <Stack>
        {wallets.map(wallet => (
          <WalletCard id={wallet.id} key={wallet.id} wallet={wallet} onClick={handleWalletSelect} />
        ))}
        <Button size='lg' variant='outline' onClick={handleToggleWallets}>
          {translate('connectWalletPage.importExisting')}
        </Button>
        {error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
      </Stack>
    )
  }, [
    error,
    handleCreate,
    handleImport,
    handleToggleWallets,
    handleWalletSelect,
    hideWallets,
    translate,
    wallets,
  ])

  return (
    <Flex
      gap={6}
      bg='radial-gradient(228.95% 64.62% at 50% 5.25%, rgba(55, 97, 249, 0.40) 0%, rgba(0, 0, 0, 0.00) 100%), #101010'
      flexDir='column'
      height='100dvh'
      justifyContent='flex-end'
      pb='calc(env(safe-area-inset-bottom) + 2rem)'
      overflow='hidden'
      style={containerStyles}
    >
      <Flex flex={1} position='absolute' width='100%' height='58%' top={0} left={0}>
        <Image src={GreenFox} position='absolute' left={0} bottom={0} width='auto' height='63%' />
        <Image src={BlueFox} position='absolute' top={0} right={0} width='auto' height='120%' />
        <Image src={OrangeFox} position='absolute' top={0} left={0} width='auto' height='65%' />
      </Flex>
      <AnimatePresence mode='wait'>
        {isLoading ? (
          <FadeTransition key='loading'>
            <Center height='100vh'>
              <CircularProgress />
            </Center>
          </FadeTransition>
        ) : (
          <SlideTransitionY key='content'>
            <Stack px={6} spacing={6}>
              <Stack textAlign='center' spacing={2}>
                <Heading fontSize='24px' letterSpacing='-0.684px' fontWeight='semibold'>
                  {translate(
                    hideWallets
                      ? 'connectWalletPage.welcomeToShapeShift'
                      : 'connectWalletPage.welcomeBack',
                  )}
                </Heading>
                <RawText
                  letterSpacing='-0.32px'
                  color='text.subtle'
                  fontWeight='medium'
                  maxWidth='90%'
                  mx='auto'
                >
                  {translate(
                    hideWallets
                      ? 'connectWalletPage.mobileWelcomeBody'
                      : 'connectWalletPage.mobileSelectBody',
                  )}
                </RawText>
              </Stack>
              {content}
              <RawText
                fontSize='sm'
                color='text.subtle'
                textAlign='center'
                maxWidth='80%'
                mx='auto'
              >
                By connecting a wallet, you agree to ShapeShift's Terms of Service.
              </RawText>
            </Stack>
          </SlideTransitionY>
        )}
      </AnimatePresence>
    </Flex>
  )
}
