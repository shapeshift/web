import { ArrowForwardIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Button, ModalBody, ModalFooter, Stack, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { AccountsIcon } from 'components/Icons/Accounts'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

export const Notice = () => {
  const translate = useTranslate()
  const iconColor = useColorModeValue('gray.200', 'gray.700')

  const { close: handleClose } = useModal('mobileWelcomeModal')
  const { open } = useModal('backupNativePassphrase')

  const handleRecoveryClick = useCallback(() => {
    handleClose()
    open({ preventClose: true })
    store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
  }, [handleClose, open])

  const handleDismissClick = useCallback(() => {
    handleClose()
    store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
  }, [handleClose])

  return (
    <SlideTransition>
      <ModalBody>
        <Stack justifyContent='center' alignItems='center' spacing={4} py={6}>
          <Box position='relative'>
            <AccountsIcon boxSize='16' color={iconColor} />
            <WarningTwoIcon boxSize='6' color='yellow.300' position='absolute' right={-4} top={2} />
          </Box>

          <Stack textAlign='center' spacing={2}>
            <Text
              fontSize='lg'
              fontWeight='bold'
              translation='modals.mobileWelcome.notice.header'
            />
            <Text color='text.subtle' translation='modals.mobileWelcome.notice.body' />
          </Stack>
        </Stack>
      </ModalBody>
      <ModalFooter flexDir='column' gap={2}>
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={handleRecoveryClick}
          rightIcon={<ArrowForwardIcon />}
        >
          {translate('modals.mobileWelcome.notice.primaryCta')}
        </Button>
        <Button width='full' variant='ghost' onClick={handleDismissClick}>
          {translate('modals.mobileWelcome.notice.secondaryCta')}
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
