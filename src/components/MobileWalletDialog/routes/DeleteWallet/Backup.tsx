import { Button, Heading, Stack } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useHistory } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderLeft } from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

// TODO: This is placeholder content follow up PR will implement this correctly

type BackupProps = {
  onBack: () => void
}

export const Backup: React.FC<BackupProps> = ({ onBack }) => {
  const history = useHistory()
  const backupModal = useModal('backupNativePassphrase')

  const handleContinue = useCallback(() => {
    history.push(MobileWalletDialogRoutes.CONFIRM_DELETE)
  }, [history])

  const handleBackup = useCallback(() => {
    backupModal.open({})
  }, [backupModal])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={onBack} />
        </DialogHeaderLeft>
      </DialogHeader>
      <DialogBody pb={8}>
        <Stack>
          <Heading size='md' textAlign='center' maxWidth='250px' mx='auto'>
            Backup wallet
          </Heading>
          <RawText textAlign='center' maxWidth='300px' mx='auto' mb={6} color='text.subtle'>
            Before you forget your wallet, would you like to back up your secret recovery phrase?
          </RawText>
        </Stack>
      </DialogBody>
      <DialogFooter flexDir='column' gap={2}>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleBackup}>
          Backup Now
        </Button>
        <Button colorScheme='gray' size='lg' width='full' onClick={handleContinue}>
          No Thanks
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
