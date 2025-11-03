import { Button, Stack, Text as CText } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderMiddle } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { Text } from '@/components/Text'

type ConfirmDeleteProps = {
  entryName: string
  onDelete: () => void
  onClose: () => void
  isOpen: boolean
}

export const ConfirmDelete = ({ entryName, onDelete, onClose, isOpen }: ConfirmDeleteProps) => {
  const translate = useTranslate()

  const handleConfirm = useCallback(() => {
    onDelete()
    onClose()
  }, [onDelete, onClose])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogHeader>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('modals.send.confirmDelete.title')}</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <DialogBody>
        <CText color='text.subtle' textAlign='center' py={4}>
          {translate('modals.send.confirmDelete.message', { name: entryName })}
        </CText>
      </DialogBody>
      <DialogFooter>
        <Stack direction='row' spacing={3} width='full'>
          <Button flex={1} onClick={onClose}>
            <Text translation='common.cancel' />
          </Button>
          <Button flex={1} colorScheme='red' onClick={handleConfirm}>
            <Text translation='common.delete' />
          </Button>
        </Stack>
      </DialogFooter>
    </Dialog>
  )
}
