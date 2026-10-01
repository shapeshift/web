import { Card } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

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
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'

type UnstakeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const UnstakeModal: React.FC<UnstakeModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleClaim = useCallback(
    (unstakingRequest: UnstakingRequest) => {
      onClose()
      navigate(`/fox-ecosystem/${unstakingRequest.index}/confirm`, {
        state: { selectedUnstakingRequest: unstakingRequest },
      })
    },
    [navigate, onClose],
  )

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
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
          <Unstake onClose={onClose} onClaim={handleClaim} />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
