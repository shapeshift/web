import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useCallback, useEffect } from 'react'

import { SnapContentRouter } from './SnapContent'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'

export type SnapsModalProps = {
  isRemoved?: boolean
}

export const Snaps: React.FC<SnapsModalProps> = ({ isRemoved }) => {
  const { close, isOpen } = useModal('snaps')
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: close,
  })

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
    <Modal {...modalProps} isCentered size='sm'>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps} minW='450px'>
        <ModalCloseButton />
        <SnapContentRouter
          isRemoved={isRemoved}
          isCorrectVersion={isCorrectVersion}
          isSnapInstalled={isSnapInstalled}
          onClose={handleClose}
        />
      </ModalContent>
    </Modal>
  )
}
