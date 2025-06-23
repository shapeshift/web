import { Button, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TbHelpHexagonFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../../types'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'

type CreateSkipConfirmProps = {
  onClose: () => void
}

export const CreateSkipConfirm = ({ onClose }: CreateSkipConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const location = useLocation()

  const handleConfirm = useCallback(() => {
    navigate(MobileWalletDialogRoutes.CreateBackupSuccess, {
      state: { vault: location.state?.vault },
    })
  }, [navigate, location.state?.vault])

  const handleBack = useCallback(() => {
    if (!location.state?.vault) return

    navigate(MobileWalletDialogRoutes.CreateBackupConfirm, {
      state: { vault: location.state?.vault },
    })
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
      </DialogBody>
      <DialogFooter flexDirection='column' gap={2} mt={14}>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleConfirm}>
          {translate('modals.shapeShift.backupPassphrase.skip.confirmCta')}
        </Button>
        <Button size='lg' width='full' onClick={handleBack} variant='ghost'>
          {translate('common.goBack')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
