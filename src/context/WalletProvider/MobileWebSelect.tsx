import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  HStack,
  Icon,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import {
  baseChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { TbChevronDown, TbChevronUp } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WalletListButton } from './components/WalletListButton'
import { KeyManager } from './KeyManager'
import { WalletConnectDirectRow } from './WalletConnectV2/components/WalletConnectDirectRow'
import { useWalletConnectV2Pairing } from './WalletConnectV2/useWalletConnectV2Pairing'

import { ChainIcon } from '@/components/ChainMenu'
import { PhantomIcon } from '@/components/Icons/PhantomIcon'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'

const collapseStyle = { width: '100%' }

type MobileWebSelectProps = {
  isOpen: boolean
  onClose: () => void
}

export const MobileWebSelect: React.FC<PropsWithChildren<MobileWebSelectProps>> = ({
  isOpen,
  onClose,
  children,
}) => {
  const translate = useTranslate()
  const { pairDevice, isLoading, error } = useWalletConnectV2Pairing()
  const { isOpen: isCollapseOpen, onToggle: onCollapseToggle } = useDisclosure({
    defaultIsOpen: true,
  })
  const { connect } = useWallet()
  const navigate = useNavigate()

  const handlePhantomConnect = useCallback(() => {
    navigate('/phantom/connect')
    connect(KeyManager.Phantom, false)
  }, [connect, navigate])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogBody padding={0}>
        <Stack spacing={8} pt={4} pb={6}>
          <WalletConnectDirectRow />
          <HStack spacing={4}>
            <Divider />
            <Stack spacing={0} flexShrink={0} flexGrow={0} textAlign='center'>
              <Text
                translation='walletProvider.selectModal.ctaText'
                fontWeight='bold'
                fontSize='md'
              />
              <Text
                translation='walletProvider.selectModal.ctaSubtext'
                fontSize='sm'
                color='text.subtle'
              />
            </Stack>
            <Divider />
          </HStack>
          <Box px={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              onClick={pairDevice}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              {translate('walletProvider.selectModal.viewAllWallets')}
            </Button>
            {error && (
              <Alert status='info'>
                <AlertIcon />
                <AlertDescription>
                  <Text translation={error} />
                </AlertDescription>
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogBody>
      <DialogFooter
        px={0}
        bg='background.surface.raised.accent'
        flexDir='column'
        gap={4}
        pb={8}
        mb='calc(calc(env(safe-area-inset-bottom) + 1rem) * -1)'
        width='full'
        borderTopWidth={1}
        borderColor='border.base'
        pt={4}
      >
        <Flex
          px={4}
          height='44px'
          width='full'
          justifyContent='space-between'
          alignItems='center'
          onClick={onCollapseToggle}
        >
          <Text translation='walletProvider.selectModal.multiChainWallets' fontWeight='bold' />
          <HStack spacing={1}>
            <ChainIcon size='xs' chainId={btcChainId} />
            <ChainIcon size='xs' chainId={ethChainId} />
            <ChainIcon size='xs' chainId={baseChainId} />
            <ChainIcon size='xs' chainId={polygonChainId} />
            <ChainIcon size='xs' chainId={gnosisChainId} />
            <Icon as={isCollapseOpen ? TbChevronUp : TbChevronDown} />
          </HStack>
        </Flex>
        <Collapse in={isCollapseOpen} style={collapseStyle}>
          <Box px={2} width='full' maxHeight='300px' overflowY='auto'>
            {!isMobile && (
              <WalletListButton
                name='Phantom'
                icon={<PhantomIcon />}
                onSelect={handlePhantomConnect}
                isSelected={false}
              />
            )}
            {children}
          </Box>
        </Collapse>
      </DialogFooter>
    </Dialog>
  )
}
