import { Card } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Unstake } from './Unstake/Unstake'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'

type UnstakeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const UnstakeModal: React.FC<UnstakeModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()

  return (
    <Dialog id='unstake-modal' isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogHeader pl={6} pe={0}>
        <DialogHeaderLeft>
          <DialogTitle>{translate('defi.unstake')}</DialogTitle>
        </DialogHeaderLeft>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody p={0}>
        <Card bg='transparent'>
          <Unstake />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
