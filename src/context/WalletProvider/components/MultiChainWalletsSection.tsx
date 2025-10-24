import { Avatar, Box, Button, Flex, HStack, Icon, Stack } from '@chakra-ui/react'
import {
  bscChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { TbChevronRight } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

import { KeepKeyConfig } from '../KeepKey/config'
import { KeyManager } from '../KeyManager'
import { LedgerConfig } from '../Ledger/config'
import { NativeWalletRoutes } from '../types'

import { ChainIcon } from '@/components/ChainMenu'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { RawText } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LedgerIcon = <Icon as={LedgerConfig.icon} />
const KeepKeyIcon = <Icon as={KeepKeyConfig.icon} />
const foxAvatarIcon = <FoxIcon />
const arrowForwardIcon = <TbChevronRight />

type MultiChainWalletsSectionProps = {
  onWalletSelect: (id: string, initialRoute: string) => void
}

export const MultiChainWalletsSection = ({ onWalletSelect }: MultiChainWalletsSectionProps) => {
  const { connect } = useWallet()
  const navigate = useNavigate()

  const handleConnectLedger = useCallback(() => {
    onWalletSelect(KeyManager.Ledger, '/ledger/connect')
    connect(KeyManager.Ledger, false)
  }, [connect, onWalletSelect])

  const handleConnectKeepKey = useCallback(() => {
    onWalletSelect(KeyManager.KeepKey, '/keepkey/connect')
    connect(KeyManager.KeepKey, false)
  }, [connect, onWalletSelect])

  const handleConnectShapeShiftWallet = useCallback(() => {
    navigate(NativeWalletRoutes.Connect)
  }, [navigate])

  return (
    <Stack
      px={0}
      bg='background.surface.raised.accent'
      flexDir='column'
      spacing={4}
      borderTopWidth={1}
      borderColor='border.base'
      pb={4}
    >
      <Flex px={4} pt={4} width='full' justifyContent='space-between' alignItems='center'>
        <RawText fontWeight='bold'>Multi-Chain Wallets</RawText>
        <HStack>
          <ChainIcon size='xs' chainId={btcChainId} />
          <ChainIcon size='xs' chainId={ethChainId} />
          <ChainIcon size='xs' chainId={bscChainId} />
          <ChainIcon size='xs' chainId={polygonChainId} />
          <ChainIcon size='xs' chainId={gnosisChainId} />
        </HStack>
      </Flex>
      <Box px={2} width='full'>
        <Button
          variant='ghost'
          height='auto'
          py={2}
          px={2}
          justifyContent='space-between'
          size='lg'
          width='full'
          rightIcon={arrowForwardIcon}
          onClick={handleConnectShapeShiftWallet}
        >
          <HStack spacing={4}>
            <Avatar
              size='lg'
              bg='background.button.secondary.base'
              borderRadius='lg'
              icon={foxAvatarIcon}
            />
            <RawText color='text.base'>ShapeShift Wallet</RawText>
          </HStack>
        </Button>
        <Button
          variant='ghost'
          height='auto'
          py={2}
          px={2}
          justifyContent='space-between'
          size='lg'
          width='full'
          rightIcon={arrowForwardIcon}
          onClick={handleConnectLedger}
        >
          <HStack spacing={4}>
            <Avatar
              size='lg'
              bg='background.button.secondary.base'
              borderRadius='lg'
              icon={LedgerIcon}
            />
            <RawText color='text.base'>{LedgerConfig.name}</RawText>
          </HStack>
        </Button>
        <Button
          variant='ghost'
          height='auto'
          py={2}
          px={2}
          justifyContent='space-between'
          size='lg'
          width='full'
          rightIcon={arrowForwardIcon}
          onClick={handleConnectKeepKey}
        >
          <HStack spacing={4}>
            <Avatar
              size='lg'
              bg='background.button.secondary.base'
              borderRadius='lg'
              icon={KeepKeyIcon}
            />
            <RawText color='text.base'>{KeepKeyConfig.name}</RawText>
          </HStack>
        </Button>
      </Box>
    </Stack>
  )
}
