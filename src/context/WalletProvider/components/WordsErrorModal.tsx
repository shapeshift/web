import { Button, Flex, Icon, ModalBody, Text, VStack } from '@chakra-ui/react'
import { TbAlertCircleFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

type WordsErrorModalProps = {
  onRetry: () => void
  onReviewPhrase: () => void
}

export const WordsErrorModal = ({ onRetry, onReviewPhrase }: WordsErrorModalProps) => {
  const translate = useTranslate()

  return (
    <>
      <ModalBody>
        <VStack spacing={6} alignItems='center' flex={1} justifyContent='center'>
          <Icon as={TbAlertCircleFilled} boxSize='70px' color='red.500' />

          <VStack spacing={2} mb={10}>
            <Text fontSize='xl' fontWeight='bold'>
              {translate('modals.shapeShift.backupPassphrase.error.title')}
            </Text>
            <Text color='text.subtle' textAlign='center'>
              {translate('modals.shapeShift.backupPassphrase.error.description')}
            </Text>
          </VStack>
        </VStack>

        <Flex flexDir='column' gap={2} justifyContent='center' mt={6}>
          <Button colorScheme='blue' size='lg' width='full' onClick={onRetry}>
            {translate('errorPage.cta')}
          </Button>
          <Button size='lg' width='full' onClick={onReviewPhrase} variant='ghost'>
            {translate('modals.shapeShift.backupPassphrase.error.reviewPhrase')}
          </Button>
        </Flex>
      </ModalBody>
    </>
  )
}
