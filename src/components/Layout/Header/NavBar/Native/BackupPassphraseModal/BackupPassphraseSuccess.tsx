import { Box, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

export const BackupPassphraseSuccess = () => (
  <SlideTransition>
    <ModalCloseButton />
    <ModalBody>
      <Box>
        <Text translation={'modals.shapeShift.backupPassphrase.success.title'} />
      </Box>
      <Box color='gray.500'>
        <Text translation={'modals.shapeShift.backupPassphrase.success.description'} />
      </Box>
    </ModalBody>
  </SlideTransition>
)
