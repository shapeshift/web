import { CheckIcon } from '@chakra-ui/icons'
import { Box, Center, Circle, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

export const BackupPassphraseSuccess = () => (
  <SlideTransition>
    <ModalCloseButton />
    <ModalBody>
      <Center flexDir='column' mt={4}>
        <Circle bg='green.500' size='50px'>
          <CheckIcon color='gray.900' fontSize='2xl' />
        </Circle>
        <Box mt={4}>
          <Text
            fontWeight='bold'
            translation={'modals.shapeShift.backupPassphrase.success.title'}
          />
        </Box>
        <Box color='text.subtle'>
          <Text
            translation={'modals.shapeShift.backupPassphrase.success.description'}
            textAlign='center'
          />
        </Box>
      </Center>
    </ModalBody>
  </SlideTransition>
)
