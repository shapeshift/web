import { useEffect, useMemo, useState } from 'react'

import { useModalStack } from './ModalStackProvider'

export type UseModalRegistrationProps = {
  isOpen: boolean
  modalId: string
}

export const useModalRegistration = ({ isOpen, modalId }: UseModalRegistrationProps) => {
  const { registerModal, unregisterModal, isTopModal } = useModalStack()
  const [zIndex, setZIndex] = useState<number | undefined>()

  useEffect(() => {
    if (isOpen) {
      const newZIndex = registerModal(modalId)
      setZIndex(newZIndex)
    } else {
      unregisterModal(modalId)
      setZIndex(undefined)
    }

    return () => {
      unregisterModal(modalId)
    }
  }, [isOpen, modalId, registerModal, unregisterModal])

  const isHighestModal = useMemo(() => isTopModal(modalId), [isTopModal, modalId])

  const modalStyle = useMemo(() => {
    return zIndex
      ? {
          sx: {
            zIndex: `calc(var(--chakra-zIndices-modal) + ${zIndex})`,
            pointerEvents: isHighestModal ? 'auto' : 'none',
          },
        }
      : undefined
  }, [zIndex, isHighestModal])

  const overlayStyle = useMemo(() => {
    return zIndex
      ? {
          sx: {
            zIndex: `calc(var(--chakra-zIndices-overlay) + ${zIndex})`,
            pointerEvents: isHighestModal ? 'auto' : 'none',
          },
        }
      : undefined
  }, [zIndex, isHighestModal])

  return {
    zIndex,
    modalStyle,
    overlayStyle,
    isHighestModal,
  }
}
