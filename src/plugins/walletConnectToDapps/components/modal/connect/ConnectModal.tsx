import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import {
  Button,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  ModalCloseButton,
  VStack
} from '@chakra-ui/react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import type { FC } from 'react'
import { FaQrcode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

type Props = {
  isOpen: boolean
  onClose(): void
}

export const ConnectModal: FC<Props> = ({ isOpen, onClose }) => {
  const translate = useTranslate()
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />

      <ModalContent
        width='full'
        textAlign='center'
        p={8}
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalCloseButton position='absolute' color='gray.500' />

        <VStack spacing={8}>
          <WalletConnectIcon fontSize='9xl' />
          <Heading flex={1} fontSize='xl'>
            <Text translation='plugins.walletConnectToDapps.modal.connect.title' />
          </Heading>
          <Button colorScheme='blue' variant='link' href='#' target='_blank'>
            {translate('plugins.walletConnectToDapps.modal.connect.howTo')}
          </Button>
          <InputGroup size='lg'>
            <InputRightElement pointerEvents='none'>
              <FaQrcode color='gray.300' />
            </InputRightElement>
            <Input
              type='text'
              placeholder={translate('plugins.walletConnectToDapps.modal.connect.linkPlaceholder')}
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              variant='filled'
              onPaste={(e) => alert(e.clipboardData.getData('text'))}
            />
          </InputGroup>
        </VStack>
      </ModalContent>
    </Modal>
  )
}
