import { Card, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftmonorepo/caip'
import React from 'react'

import { FoxWifHatClaim } from './FoxWifHatClaim/FoxWifHatClaim'

type FoxWifHatClaimModalProps = {
  isOpen: boolean
  accountId?: AccountId
  onClose: () => void
}

const modalBorderRadius = { base: 0, md: '2xl' }

export const FoxWifHatClaimModal: React.FC<FoxWifHatClaimModalProps> = ({
  isOpen = false,
  onClose,
  accountId,
}) => {
  if (!accountId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent width='100%' maxWidth='500px' borderRadius={modalBorderRadius}>
        <Card>
          <FoxWifHatClaim accountId={accountId} />
        </Card>
      </ModalContent>
    </Modal>
  )
}
