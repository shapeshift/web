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
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Card } from 'components/Card/Card'
import { QRCode } from 'components/QRCode/QRCode'
import { RawText, Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { ReduxState } from 'state/reducer'
import { getAccountTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'

type ReceivePropsType = {
  asset: AssetMarketData
}

const Receive = ({ asset }: ReceivePropsType) => {
  const { chain, name, symbol } = asset
  const { state } = useWallet()
  const [isNativeWallet, setIsNativeWallet] = useState<boolean>(true)
  const [receiveAddress, setReceiveAddress] = useState<string>('')
  const chainAdapterManager = useChainAdapters()

  const currentAccountType: UtxoAccountType = useSelector(
    (state: ReduxState) => state.preferences[getAccountTypeKey(asset.chain)]
  )

  useEffect(() => {
    ;(async () => {
      const { wallet } = state
      if (!wallet) return
      setIsNativeWallet((await wallet.getLabel()) === 'Native')
      const chainAdapter = chainAdapterManager.byChain(chain)
      if (!chainAdapter) throw new Error(`Receive: unsupported chain ${chain}`)
      const accountParams = currentAccountType
        ? utxoAccountParams(asset, currentAccountType, 0)
        : {}
      setReceiveAddress(
        await chainAdapter.getAddress({
          wallet,
          ...accountParams
        })
      )
    })()
  }, [chain, chainAdapterManager, state, setReceiveAddress, currentAccountType, asset])

  const translate = useTranslate()
  const toast = useToast()
  const { receive } = useModal()
  const { close, isOpen } = receive

  const hoverColor = useColorModeValue('gray.900', 'white')
  const bg = useColorModeValue('gray.100', 'gray.700')

  const copyHandler = async () => {
    const duration = 2500
    const isClosable = true
    const translatePayload = { symbol: symbol.toUpperCase() }
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(receiveAddress)
      const title = translate('modals.receive.copied', translatePayload)
      const status = 'success'
      const description = receiveAddress
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('modals.receive.copyFailed', translatePayload)
      const status = 'error'
      const description = translate('modals.receive.copyFailedDescription')
      toast({ description, title, status })
    }
  }

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
              onClick={copyHandler}
              padding={2}
              color='gray.500'
              flexDir='column'
              role='group'
              variant='link'
              _hover={{ textDecoration: 'none', color: hoverColor }}
            >
              <Circle bg={bg} mb={2} size='40px' _groupHover={{ bg: 'blue.500', color: 'white' }}>
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
