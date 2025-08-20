import { Card, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '../../../components/Modal/components/Dialog'
import { DialogBody } from '../../../components/Modal/components/DialogBody'
import { DialogCloseButton } from '../../../components/Modal/components/DialogCloseButton'
import { DialogTitle } from '../../../components/Modal/components/DialogTitle'
import { Stake } from './Stake/Stake'

type StakeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const StakeModal: React.FC<StakeModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogBody p={0}>
        <Card backgroundColor='none'>
          <Flex alignItems='center' justifyContent='space-between' p={4} px={6}>
            <DialogTitle>{translate('defi.stake')}</DialogTitle>
            <DialogCloseButton />
          </Flex>
          <Stake />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
