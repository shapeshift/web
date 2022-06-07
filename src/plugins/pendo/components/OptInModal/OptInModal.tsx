import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import {
  Button,
  Divider,
  List,
  ListIcon,
  ListItem,
  ModalBody,
  ModalFooter,
  useColorModeValue,
} from '@chakra-ui/react'
import { IoMdCheckmark, IoMdClose } from 'react-icons/io'
import { Text } from 'components/Text'

import { OptInIcon } from './OptInIcon'

type OptInModalProps = {
  isOpen: boolean
  close: () => void
}

export const OptInModal: React.FC<OptInModalProps> = ({ isOpen, close }) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalBody py={8}>
          <OptInIcon mb={4} />
          <Text
            translation='plugins.analytics.optInModal.title'
            mb={2}
            fontWeight='bold'
            fontSize='xl'
          />
          <Text
            translation='plugins.analytics.optInModal.description'
            mb={4}
            color='gray.500'
            fontWeight='500'
            fontSize='sm'
          />
          <Text
            translation='plugins.analytics.optInModal.actionsSentence'
            mb={4}
            fontWeight='500'
          />

          <List borderRadius='xl' border={borderColor} borderWidth={'1px'}>
            <ListItem
              borderBottomWidth={'1px'}
              p={4}
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              flexDirection='row'
            >
              <Text
                translation='plugins.analytics.optInModal.sendEvents'
                fontSize='sm'
                fontWeight='500'
              />
              <ListIcon as={IoMdCheckmark} mr={0} color='green.500' width='22px' height='22px' />
            </ListItem>
            <ListItem
              borderBottomWidth={'1px'}
              p={4}
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              flexDirection='row'
            >
              <Text
                translation='plugins.analytics.optInModal.neverCollectPersonalInformations'
                fontSize='sm'
                fontWeight='500'
              />
              <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
            </ListItem>
            <ListItem
              borderBottomWidth={'1px'}
              p={4}
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              flexDirection='row'
            >
              <Text
                translation='plugins.analytics.optInModal.neverCollectIp'
                fontSize='sm'
                fontWeight='500'
              />
              <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
            </ListItem>
            <ListItem
              p={4}
              display='flex'
              justifyContent='space-between'
              alignItems='center'
              flexDirection='row'
            >
              <Text
                translation='plugins.analytics.optInModal.neverSellData'
                fontSize='sm'
                fontWeight='500'
              />
              <ListIcon as={IoMdClose} mr={0} color='red.500' width='22px' height='22px' />
            </ListItem>
          </List>
        </ModalBody>

        <Divider mb={4} />

        <ModalFooter flexDirection='column'>
          <Button isFullWidth colorScheme={'blue'} size='md' onClick={() => true}>
            <Text translation={'common.continue'} />
          </Button>
          <Button isFullWidth variant='ghost' size='md' mt={3} onClick={() => true}>
            <Text translation='plugins.analytics.optInModal.noThanks' />
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
