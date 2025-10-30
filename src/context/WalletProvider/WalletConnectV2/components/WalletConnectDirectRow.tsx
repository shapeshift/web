import { Button, Circle, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

import type { WalletConfig, WalletConnectWalletId } from '../constants'
import { WALLET_CONFIGS } from '../constants'
import { useDirectWalletConnect } from '../useDirectConnect'

import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'

const WalletConnectBadge = () => (
  <Circle size='20px' bg='#3B99FC'>
    <WalletConnectCurrentColorIcon boxSize='12px' color='white' />
  </Circle>
)

type DirectWalletButtonProps = {
  wallet: WalletConfig
  isLoading: boolean
  onConnect: (walletId: WalletConnectWalletId) => void
}

const DirectWalletButton = ({ wallet, isLoading, onConnect }: DirectWalletButtonProps) => {
  const handleClick = useCallback(() => onConnect(wallet.id), [onConnect, wallet.id])

  const icon = useMemo(() => {
    if (isLoading) {
      return <Spinner thickness='4px' speed='0.65s' boxSize='64px' />
    }
    if ('IconComponent' in wallet && wallet.IconComponent) {
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
  const { connect } = useDirectWalletConnect()
  const [loadingWallet, setLoadingWallet] = useState<WalletConnectWalletId | null>(null)

  const handleDirectConnect = useCallback(
    async (walletId: WalletConnectWalletId) => {
      setLoadingWallet(walletId)

      try {
        await connect(walletId)
        setLoadingWallet(null)
      } catch (error) {
        console.error('Direct connection failed:', error)
        setLoadingWallet(null)
      }
    },
    [connect],
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
