import { Button, Circle, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'

import type { WalletConfig } from '../constants'
import { CONNECTION_TIMEOUT_MS, POLLING_INTERVAL_MS, WALLET_CONFIGS } from '../constants'
import { useDirectWalletConnect } from '../useDirectConnect'

import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

const WalletConnectBadge = () => (
  <Circle size='20px' bg='#3B99FC'>
    <WalletConnectCurrentColorIcon boxSize='12px' color='white' />
  </Circle>
)

type DirectWalletButtonProps = {
  wallet: WalletConfig
  isLoading: boolean
  onConnect: (walletId: 'metamask' | 'trust' | 'zerion') => void
}

const DirectWalletButton = ({ wallet, isLoading, onConnect }: DirectWalletButtonProps) => {
  const handleClick = useCallback(() => onConnect(wallet.id), [onConnect, wallet.id])

  const icon = useMemo(() => {
    if (isLoading) {
      return <Spinner thickness='4px' speed='0.65s' boxSize='64px' />
    }
    if (wallet.IconComponent) {
      return (
        <Flex boxSize='64px' align='center' justify='center' bg='white' borderRadius='lg' p={2}>
          <wallet.IconComponent boxSize='48px' />
        </Flex>
      )
    }
    return <Image src={wallet.imageUrl} boxSize='64px' borderRadius='lg' />
  }, [isLoading, wallet])

  return (
    <Button
      onClick={handleClick}
      isDisabled={isLoading}
      variant='ghost'
      height='auto'
      minH='120px'
      py={4}
      px={3}
      whiteSpace='normal'
      flex={1}
    >
      <Flex direction='column' align='center' justify='center' width='full'>
        {icon}
        <Flex align='center' gap={1.5} mt={3}>
          <Text fontSize='sm' fontWeight='medium'>
            {wallet.name}
          </Text>
          <WalletConnectBadge />
        </Flex>
      </Flex>
    </Button>
  )
}

export const WalletConnectDirectRow = () => {
  const { connectToWallet, error } = useDirectWalletConnect()
  const { state, dispatch } = useWallet()
  const [loadingWallet, setLoadingWallet] = useState<'metamask' | 'trust' | 'zerion' | null>(null)
  const [mobilePending, setMobilePending] = useState(false)

  useEffect(() => {
    if (isMobile && mobilePending && loadingWallet) {
      const checkInterval = setInterval(() => {
        const provider = (window as any).walletConnectProvider

        if ((provider?.session && provider?.accounts?.length > 0) || state.isConnected) {
          clearInterval(checkInterval)
          setMobilePending(false)
          setLoadingWallet(null)
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }
      }, POLLING_INTERVAL_MS)

      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        setMobilePending(false)
        setLoadingWallet(null)
      }, CONNECTION_TIMEOUT_MS)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [mobilePending, state.isConnected, loadingWallet, dispatch])

  useEffect(() => {
    if (error) {
      console.error('Direct connection error:', error)
      setLoadingWallet(null)
      setMobilePending(false)
    }
  }, [error])

  const handleDirectConnect = useCallback(
    async (walletId: 'metamask' | 'trust' | 'zerion') => {
      setLoadingWallet(walletId)

      try {
        await connectToWallet(walletId)

        if (isMobile) {
          setMobilePending(true)
        }
      } catch (error) {
        console.error('Direct connection failed:', error)
        setLoadingWallet(null)
        setMobilePending(false)
      }
    },
    [connectToWallet],
  )

  return (
    <Flex gap={4} mt={4} align='stretch'>
      {WALLET_CONFIGS.map(wallet => (
        <DirectWalletButton
          key={wallet.id}
          wallet={wallet}
          isLoading={loadingWallet === wallet.id}
          onConnect={handleDirectConnect}
        />
      ))}
    </Flex>
  )
}
