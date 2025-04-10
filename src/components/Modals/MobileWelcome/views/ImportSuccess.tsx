import { ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'

const arrowForwardIcon = <ArrowForwardIcon />

export const ImportSuccess = () => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleContinueClick = useCallback(() => navigate('/notice'), [navigate])

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
          rightIcon={arrowForwardIcon}
        >
          {translate('modals.mobileWelcome.success.primaryCta')}
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
