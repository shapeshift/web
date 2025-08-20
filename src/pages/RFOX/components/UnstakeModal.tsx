import { Card, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '../../../components/Modal/components/Dialog'
import { DialogBody } from '../../../components/Modal/components/DialogBody'
import { DialogCloseButton } from '../../../components/Modal/components/DialogCloseButton'
import { DialogTitle } from '../../../components/Modal/components/DialogTitle'
import { Unstake } from './Unstake/Unstake'

type UnstakeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const UnstakeModal: React.FC<UnstakeModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogBody p={0}>
        <Card>
          <Flex alignItems='center' justifyContent='space-between' p={4} px={6}>
            <DialogTitle>{translate('defi.unstake')}</DialogTitle>
            <DialogCloseButton />
          </Flex>
          <Unstake />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
