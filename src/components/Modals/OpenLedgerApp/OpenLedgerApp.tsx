import { Button, Flex, Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { type FC, useCallback } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

const flexMinWidth = { base: '100%', md: '500px' }
const flexMaxWidth = { base: '100%', md: '500px' }

export interface OpenLedgerAppProps {}

export const OpenLedgerApp: FC<OpenLedgerAppProps> = () => {
  const { close, isOpen } = useModal('openLedgerApp')

  const onClick = useCallback(() => {
    console.log('Are you sure the app is open ser?')
  }, [])

  const handleClose = useCallback(() => {
    close()
  }, [close])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent minW='450px'>
        <ModalCloseButton />
        <Flex width='full' minWidth={flexMinWidth} maxWidth={flexMaxWidth} flexDir='column'>
          <Button size='lg' width='full' colorScheme='blue' onClick={onClick}>
            <Text translation='common.continue' />
          </Button>
          <Button size='lg' width='full' variant='ghost' onClick={handleClose}>
            <Text translation='common.cancel' />
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
