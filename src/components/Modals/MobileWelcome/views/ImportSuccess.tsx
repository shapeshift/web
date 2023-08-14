import { ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

export const ImportSuccess = () => {
  const history = useHistory()
  const translate = useTranslate()

  const handleContinueClick = useCallback(() => history.push('/notice'), [history])

  return (
    <SlideTransition>
      <ModalBody>
        <Stack justifyContent='center' alignItems='center' spacing={4} py={10}>
          <CheckCircleIcon boxSize='12' color='green.500' />
          <Stack spacing={0} textAlign='center'>
            <Text
              fontSize='lg'
              fontWeight='bold'
              translation='modals.mobileWelcome.success.header'
            />
            <Text color='text.subtle' translation='modals.mobileWelcome.success.body' />
          </Stack>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column'>
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={handleContinueClick}
          rightIcon={<ArrowForwardIcon />}
        >
          {translate('modals.mobileWelcome.success.primaryCta')}
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
