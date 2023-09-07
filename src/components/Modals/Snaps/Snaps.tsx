import { Modal, ModalCloseButton, ModalContent, ModalOverlay, useToast } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'

import { SnapContent } from './SnapContent'

export type SnapsModalProps = {
  isRemoved?: boolean
}

export const Snaps: React.FC<SnapsModalProps> = ({ isRemoved }) => {
  const { close, isOpen } = useModal('snaps')
  const isSnapsEnabled = useFeatureFlag('Snaps')
  const isSnapInstalled = useIsSnapInstalled()
  const toast = useToast()

  useEffect(() => {
    if (isSnapInstalled) {
      close()
      toast({ status: 'success', title: 'Snap Installed' })
    }
  }, [close, isSnapInstalled, toast])

  if (!isSnapsEnabled) return null

  return (
    <Modal isOpen={isOpen} onClose={() => close()} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent minW='450px'>
        <ModalCloseButton />
        <SnapContent isRemoved={isRemoved} />
      </ModalContent>
    </Modal>
  )
}
