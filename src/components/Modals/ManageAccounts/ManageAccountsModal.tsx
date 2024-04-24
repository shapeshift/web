import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useModal } from 'hooks/useModal/useModal'

export type ManageAccountsModalProps = {
  title?: string
}

const infoIcon = <InfoIcon />

export const ManageAccountsModal = ({
  title = 'accountManagement.manageAccounts.modalTitle',
}: ManageAccountsModalProps) => {
  const translate = useTranslate()
  const { close, isOpen } = useModal('manageAccounts')

  const handleInfoClick = useCallback(() => {
    console.log('info clicked')
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent borderRadius='xl' mx={3} maxW='400px'>
        <ModalHeader textAlign='center' py={12}>
          {translate(title)}
        </ModalHeader>
        <IconButton
          aria-label='Info'
          icon={infoIcon}
          variant='ghost'
          position='absolute'
          top={3}
          left={3}
          size='sm'
          onClick={handleInfoClick}
        />
        <ModalCloseButton position='absolute' top={3} right={3} />
        <ModalBody>
          {/* TODO: Implement me */}
          Placeholder content
        </ModalBody>
        <ModalFooter justifyContent='center' pb={6}>
          <Button colorScheme='blue' onClick={close} width='full'>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
