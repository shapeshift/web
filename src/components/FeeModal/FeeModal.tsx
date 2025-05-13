import { Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'

import { FeeBreakdown } from './FeeBreakdown'

import type { ParameterModel } from '@/lib/fees/parameters/types'

export type FeeModalProps = {
  inputAmountUsd: string | undefined
  isOpen: boolean
  onClose: () => void
  feeModel: ParameterModel
}

export const FeeModal = ({
  inputAmountUsd,
  isOpen,
  onClose: handleClose,
  feeModel,
}: FeeModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton zIndex='1' />
        <ModalBody p={0}>
          <FeeBreakdown feeModel={feeModel} inputAmountUsd={inputAmountUsd} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
