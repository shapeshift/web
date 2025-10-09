import { Card } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { Dialog } from '../../../components/Modal/components/Dialog'
import { DialogBody } from '../../../components/Modal/components/DialogBody'
import { DialogCloseButton } from '../../../components/Modal/components/DialogCloseButton'
import { DialogTitle } from '../../../components/Modal/components/DialogTitle'

import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { Claim } from '@/pages/RFOX/components/Claim/Claim'
import type { UnstakingRequest } from '@/pages/RFOX/hooks/useGetUnstakingRequestsQuery/utils'

type ClaimModalProps = {
  isOpen: boolean
  onClose: () => void
  selectedUnstakingRequest?: UnstakingRequest
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleClose = useCallback(() => {
    onClose()

    // quite hacky but as there is a slow animation we briefly see the claim list before it closes
    setTimeout(() => {
      navigate('/fox-ecosystem')
    }, 100)
  }, [onClose, navigate])

  return (
    <Dialog id='claim-modal' isOpen={isOpen} onClose={handleClose} height='auto'>
      <DialogHeader pl={6} pe={0}>
        <DialogHeaderLeft>
          <DialogTitle>{translate('defi.claim')}</DialogTitle>
        </DialogHeaderLeft>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody p={0}>
        <Card bg='none'>
          <Claim />
        </Card>
      </DialogBody>
    </Dialog>
  )
}
