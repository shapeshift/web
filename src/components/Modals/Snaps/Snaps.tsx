import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'

import { SnapContent } from './SnapContent'

export type SnapsModalProps = {
  isRemoved?: boolean
}

export const Snaps: React.FC<SnapsModalProps> = ({ isRemoved }) => {
  const { close, isOpen } = useModal('snaps')
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()

  useEffect(() => {
    if (isSnapInstalled && isCorrectVersion) {
      close()
    }
  }, [close, isCorrectVersion, isSnapInstalled])

  const handleClose = useCallback(() => {
    close()
  }, [close])

  if (isSnapInstalled === null) return null
  if (isCorrectVersion === null) return null

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent minW='450px'>
        <ModalCloseButton />
        <SnapContent
          isRemoved={isRemoved}
          isCorrectVersion={isCorrectVersion}
          isSnapInstalled={isSnapInstalled}
          onClose={handleClose}
        />
      </ModalContent>
    </Modal>
  )
}
