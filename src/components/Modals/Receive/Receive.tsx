import { CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import { ChainIdentifier } from '@shapeshiftoss/chain-adapters'
import { AssetMarketData } from '@shapeshiftoss/market-service'
import { Card } from 'components/Card'
import { QRCode } from 'components/QRCode/QRCode'
import { RawText, Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

type ReceivePropsType = {
  asset: AssetMarketData
}

const Receive = ({ asset }: ReceivePropsType) => {
  const { name, symbol } = asset
  const { state } = useWallet()
  const [isNativeWallet, setIsNativeWallet] = useState<boolean>(true)
  const [receiveAddress, setReceiveAddress] = useState<string>('')
  const chainAdapterManager = useChainAdapters()

  useEffect(() => {
    ;(async () => {
      const { wallet } = state
      if (!wallet) return
      setIsNativeWallet((await wallet.getLabel()) === 'Native')
      // TODO(0xdef1cafe): remove this when we unchained supports more than eth
      const chainAdapter = chainAdapterManager.byChain(ChainIdentifier.Ethereum)
      // TODO(0xdef1cafe): remove this when chain adapters has a default path
      const path = `m/44'/60'/0'/0/0`
      setReceiveAddress(await chainAdapter.getAddress({ wallet, path }))
    })()
  }, [chainAdapterManager, state, setReceiveAddress])

  const translate = useTranslate()
  const toast = useToast()
  const { receive } = useModal()
  const { close, isOpen } = receive

  const hoverColor = useColorModeValue('gray.900', 'white')
  const bg = useColorModeValue('gray.100', 'gray.700')

  const copyHandler = useMemo(
    () => () => {
      navigator.clipboard.writeText(receiveAddress)
      toast({
        title: translate('modals.receive.copied', { symbol: symbol.toUpperCase() }),
        description: receiveAddress,
        status: 'success',
        duration: 2500,
        isClosable: true
      })
    },
    [receiveAddress, symbol, toast, translate]
  )

  const Verify = useMemo(
    () => (
      <Button
        color='gray.500'
        flexDir='column'
        role='group'
        variant='link'
        _hover={{ textDecoration: 'none', color: hoverColor }}
        onClick={() =>
          toast({
            // TODO(0xdef1cafe): implement this after we support more than native wallet
            title: 'unimplemented',
            description: 'unimplemented',
            status: 'error',
            duration: 2500,
            isClosable: true
          })
        }
      >
        <Circle bg={bg} mb={2} size='40px' _groupHover={{ bg: 'blue.500', color: 'white' }}>
          <ViewIcon />
        </Circle>
        <Text translation='modals.receive.verify' />
      </Button>
    ),
    [bg, hoverColor, toast]
  )

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign='center'>
          {translate('modals.receive.receiveAsset', { asset: name })}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody alignItems='center' justifyContent='center'>
          <Card variant='inverted' width='auto' borderRadius='xl'>
            <Card.Body>
              <QRCode text={receiveAddress} />
            </Card.Body>
            <Card.Footer textAlign='center' pt={0}>
              <RawText>{receiveAddress}</RawText>
            </Card.Footer>
          </Card>
        </ModalBody>
        <ModalFooter flexDir='column'>
          <Box>
            <Text
              translation={[
                'modals.receive.onlySend',
                { asset: name, symbol: symbol.toUpperCase() }
              ]}
              color='gray.500'
              textAlign='center'
            />
          </Box>
          <HStack my={6} spacing={8}>
            <Button
              color='gray.500'
              flexDir='column'
              role='group'
              variant='link'
              _hover={{ textDecoration: 'none', color: hoverColor }}
            >
              <Circle
                bg={bg}
                mb={2}
                size='40px'
                _groupHover={{ bg: 'blue.500', color: 'white' }}
                onClick={copyHandler}
              >
                <CopyIcon />
              </Circle>
              <Text translation='modals.receive.copy' />
            </Button>
            {isNativeWallet ? null : Verify}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
