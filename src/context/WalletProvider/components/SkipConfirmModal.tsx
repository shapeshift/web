import { Button, Flex, Icon, Text, VStack } from '@chakra-ui/react'
import { TbHelpHexagonFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { DialogBody } from '@/components/Modal/components/DialogBody'

type SkipConfirmModalProps = {
  onConfirm: () => void
  onBack: () => void
}

export const SkipConfirmModal = ({ onConfirm, onBack }: SkipConfirmModalProps) => {
  const translate = useTranslate()

  return (
    <>
      <DialogBody>
        <VStack spacing={6} alignItems='center' flex={1} justifyContent='center'>
          <Icon as={TbHelpHexagonFilled} boxSize='70px' color='blue.500' />

          <VStack spacing={2} mb={10}>
            <Text fontSize='xl' fontWeight='bold'>
              {translate('modals.shapeShift.backupPassphrase.skip.title')}
            </Text>
            <Text color='text.subtle' textAlign='center'>
              {translate('modals.shapeShift.backupPassphrase.skip.description')}
            </Text>
          </VStack>
        </VStack>
        <Flex flexDir='column' gap={2} justifyContent='center' mt={6}>
          <Button colorScheme='blue' size='lg' width='full' onClick={onConfirm}>
            {translate('modals.shapeShift.backupPassphrase.skip.confirmCta')}
          </Button>
          <Button size='lg' width='full' onClick={onBack} variant='ghost'>
            {translate('common.goBack')}
          </Button>
        </Flex>
      </DialogBody>
    </>
  )
}
