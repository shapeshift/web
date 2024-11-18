import { WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Stack,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const RateChangedModal = () => {
  const rateChanged = useModal('rateChanged')
  const { close, isOpen } = rateChanged
  const translate = useTranslate()

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <ModalBody display='flex' alignItems='center' py={16} flexDir='column' gap={6}>
          <WarningIcon color='text.warning' boxSize={8} />
          <Stack textAlign='center'>
            <Heading size='sm'>{translate('trade.rates.rateExpired.title')}</Heading>
            <Text translation='trade.rates.rateExpired.body' color='text.subtle' />
          </Stack>
        </ModalBody>
        <ModalFooter pb={6}>
          <Button onClick={close} colorScheme='blue' width='full'>
            {translate('trade.rates.rateExpired.cta')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
