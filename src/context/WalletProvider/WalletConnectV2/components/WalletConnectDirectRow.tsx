import { Button, Circle, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { CONNECTION_TIMEOUT_MS, POLLING_INTERVAL_MS } from '../constants'
import { useDirectWalletConnect } from '../useDirectConnect'

import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'
import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'
import { getConfig } from '@/config'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

const { VITE_WALLET_CONNECT_WALLET_PROJECT_ID } = getConfig()

type WalletConfig = {
  id: 'metamask' | 'trust' | 'zerion'
  name: string
  imageUrl?: string
  IconComponent?: React.ComponentType<{ boxSize?: string }>
}

const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    IconComponent: MetaMaskIcon,
  },
  {
    id: 'trust',
    name: 'Trust',
    imageUrl: `https://explorer-api.walletconnect.com/v3/logo/md/7677b54f-3486-46e2-4e37-bf8747814f00?projectId=${VITE_WALLET_CONNECT_WALLET_PROJECT_ID}`,
  },
  {
    id: 'zerion',
    name: 'Zerion',
    imageUrl: `https://explorer-api.walletconnect.com/v3/logo/md/73f6f52f-7862-49e7-bb85-ba93ab72cc00?projectId=${VITE_WALLET_CONNECT_WALLET_PROJECT_ID}`,
  },
]

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

  const renderIcon = () => {
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
  }

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
        {renderIcon()}
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
