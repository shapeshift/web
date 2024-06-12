import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'

import { SnapContent } from './SnapContent'

export type SnapsModalProps = {
  isRemoved?: boolean
}

export const Snaps: React.FC<SnapsModalProps> = ({ isRemoved }) => {
  const { close, isOpen } = useModal('snaps')
  const isSnapsEnabled = useFeatureFlag('Snaps')

  if (!isSnapsEnabled) return null

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent minW='450px'>
        <ModalCloseButton />
        <SnapContent isRemoved={isRemoved} onClose={close} />
      </ModalContent>
    </Modal>
  )
}
