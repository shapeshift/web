import { Button, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TbAlertCircleFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../../types'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'

type CreateWordsErrorProps = {
  onClose: () => void
}

export const CreateWordsError = ({ onClose }: CreateWordsErrorProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const location = useLocation()

  const handleRetry = useCallback(() => {
    navigate(MobileWalletDialogRoutes.CreateBackupConfirm, {
      state: { vault: location.state?.vault },
    })
  }, [navigate, location.state?.vault])

  const handleReviewPhrase = useCallback(() => {
    if (!location.state?.vault) return

    navigate(MobileWalletDialogRoutes.CreateBackup, { state: { vault: location.state?.vault } })
  }, [navigate, location.state?.vault])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton onClick={onClose} />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
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
      </DialogBody>
      <DialogFooter flexDirection='column' gap={2} mt={14}>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleRetry}>
          {translate('errorPage.cta')}
        </Button>
        <Button size='lg' width='full' onClick={handleReviewPhrase} variant='ghost'>
          {translate('modals.shapeShift.backupPassphrase.error.reviewPhrase')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
