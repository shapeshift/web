import { Card } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '../../../components/Modal/components/Dialog'
import { DialogBody } from '../../../components/Modal/components/DialogBody'
import { DialogCloseButton } from '../../../components/Modal/components/DialogCloseButton'
import { DialogTitle } from '../../../components/Modal/components/DialogTitle'
import { Stake } from './Stake/Stake'

import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'

type StakeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const StakeModal: React.FC<StakeModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation>
      <DialogHeader pl={6} pe={0}>
        <DialogHeaderLeft>
          <DialogTitle>{translate('defi.stake')}</DialogTitle>
        </DialogHeaderLeft>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody p={0}>
        <Card bg='none'>
          <Stake />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
