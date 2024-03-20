import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Flex,
  Heading,
  Image,
  Stack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import BlueFox from 'assets/blue-fox.svg'
import GreenFox from 'assets/green-fox.svg'
import OrangeFox from 'assets/orange-fox.svg'
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
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    create(isMobile ? KeyManager.Mobile : KeyManager.Native)
  }, [create, dispatch])

  const handleImport = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    importWallet(isMobile ? KeyManager.Mobile : KeyManager.Native)
  }, [dispatch, importWallet])

  useEffect(() => {
    ;(async () => {
      if (!wallets.length) {
        try {
          const vaults = await listWallets()
          if (!vaults.length) {
            return setError('walletProvider.shapeShift.load.error.noWallet')
          }

          setWallets(vaults)
        } catch (e) {
          console.log(e)
          setWallets([])
        }
      }
    })()
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
      <Flex flex={1} position='relative' mb={-8}>
        <Image src={GreenFox} position='absolute' left={0} bottom={0} width='auto' height='63%' />
        <Image src={BlueFox} position='absolute' top={0} right={0} width='auto' height='120%' />
        <Image src={OrangeFox} position='absolute' top={0} left={0} width='auto' height='65%' />
      </Flex>
      <Stack px={6} spacing={6}>
        <Stack textAlign='center' spacing={2}>
          <Heading fontSize='24px' letterSpacing='-0.684px' fontWeight='semibold'>
            Welcome to ShapeShift
          </Heading>
          <RawText
            letterSpacing='-0.32px'
            color='text.subtle'
            fontWeight='medium'
            maxWidth='90%'
            mx='auto'
          >
            Create a brand new wallet or add an existing one to get started easily.
          </RawText>
        </Stack>
        {!wallets.length ? (
          <Stack maxWidth='80%' mx='auto' spacing={4} width='full'>
            <Button colorScheme='blue' size='lg' onClick={handleCreate}>
              Create a New Wallet
            </Button>
            <Button variant='outline' size='lg' onClick={handleImport}>
              Import an Existing Wallet
            </Button>
          </Stack>
        ) : (
          <Stack>
            {wallets.map(wallet => (
              <WalletCard
                id={wallet.id}
                key={wallet.id}
                wallet={wallet}
                onClick={handleWalletSelect}
              />
            ))}
            {error && (
              <Alert status='error'>
                <AlertIcon />
                <AlertDescription>
                  <Text translation={error} />
                </AlertDescription>
              </Alert>
            )}
          </Stack>
        )}

        <RawText fontSize='sm' color='text.subtle' textAlign='center' maxWidth='80%' mx='auto'>
          By connecting a wallet, you agree to ShapeShift's Terms of Service.
        </RawText>
      </Stack>
    </Flex>
  )
}
