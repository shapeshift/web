import { Modal, ModalCloseButton, ModalContent, ModalOverlay, useToast } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useIsSnapInstalled } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'

import { SnapContent } from './SnapContent'

export const Snaps = () => {
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
        <SnapContent />
      </ModalContent>
    </Modal>
  )
}
