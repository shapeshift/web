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
  useColorModeValue
} from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { QRCode } from 'components/QRCode/QRCode'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useTranslate } from 'react-polyglot'

const Receive = () => {
  const translate = useTranslate()
  const modal = useModal()
  return (
    <Modal isOpen={modal.receive} onClose={() => modal.close('receive')} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign='center'>
          {translate('modals.receive.receiveAsset', { asset: 'Bitcoin' })}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody alignItems='center' justifyContent='center'>
          <Card variant='inverted' width='auto' borderRadius='xl'>
            <Card.Body>
              <QRCode text='3F9geWenC9PiUzmmSwLanjSqXLBAQfaryz' />
            </Card.Body>
            <Card.Footer textAlign='center' pt={0}>
              <RawText>3F9geWenC9PiUzmmSwLanjSqXLBAQfaryz</RawText>
            </Card.Footer>
          </Card>
        </ModalBody>
        <ModalFooter flexDir='column'>
          <Box>
            <Text
              translation={['modals.receive.onlySend', { asset: 'Bitcoin', symbol: 'BTC' }]}
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
              _hover={{ textDecoration: 'none', color: useColorModeValue('gray.900', 'white') }}
            >
              <Circle
                bg={useColorModeValue('gray.100', 'gray.700')}
                mb={2}
                size='40px'
                _groupHover={{ bg: 'blue.500', color: 'white' }}
              >
                <CopyIcon />
              </Circle>
              <Text translation='modals.receive.copy' />
            </Button>
            <Button
              color='gray.500'
              flexDir='column'
              role='group'
              variant='link'
              _hover={{ textDecoration: 'none', color: useColorModeValue('gray.900', 'white') }}
            >
              <Circle
                bg={useColorModeValue('gray.100', 'gray.700')}
                mb={2}
                size='40px'
                _groupHover={{ bg: 'blue.500', color: 'white' }}
              >
                <CopyIcon />
              </Circle>
              <Text translation='modals.receive.setAmount' />
            </Button>
            <Button
              color='gray.500'
              flexDir='column'
              role='group'
              variant='link'
              _hover={{ textDecoration: 'none', color: useColorModeValue('gray.900', 'white') }}
            >
              <Circle
                bg={useColorModeValue('gray.100', 'gray.700')}
                mb={2}
                size='40px'
                _groupHover={{ bg: 'blue.500', color: 'white' }}
              >
                <ViewIcon />
              </Circle>
              <Text translation='modals.receive.verify' />
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
