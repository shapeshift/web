import { useEffect, useMemo } from 'react'

import { useModalStack } from './ModalStackProvider'

export type UseModalRegistrationProps = {
  isOpen: boolean
  modalId: string
  onClose: () => void
}

export const useModalRegistration = ({ isOpen, modalId, onClose }: UseModalRegistrationProps) => {
  const { registerModal, unregisterModal, getIsHighestModal, getZIndex } = useModalStack()

  const zIndex = useMemo(() => getZIndex(modalId), [getZIndex, modalId])

  useEffect(() => {
    if (isOpen) {
      registerModal(modalId)
    } else {
      unregisterModal(modalId)
    }

    return () => {
      unregisterModal(modalId)
    }
  }, [isOpen, modalId, registerModal, unregisterModal])

  const isHighestModal = useMemo(() => getIsHighestModal(modalId), [getIsHighestModal, modalId])

  const modalContentProps = useMemo(() => {
    return zIndex
      ? {
          containerProps: {
            sx: {
              zIndex: `calc(var(--chakra-zIndices-modal) + ${zIndex})`,
              pointerEvents: isHighestModal ? 'auto' : 'none',
            },
          },
        }
      : undefined
  }, [zIndex, isHighestModal])

  const overlayProps = useMemo(() => {
    return zIndex
      ? {
          sx: {
            zIndex: `calc(var(--chakra-zIndices-overlay) + ${zIndex})`,
            pointerEvents: isHighestModal ? 'auto' : 'none',
          },
        }
      : undefined
  }, [zIndex, isHighestModal])

  const modalProps = useMemo(() => {
    return {
      trapFocus: isHighestModal,
      blockScrollOnMount: isHighestModal,
      closeOnEsc: isHighestModal,
      closeOnOverlayClick: isHighestModal,
      isOpen,
      onClose,
    }
  }, [isHighestModal, isOpen, onClose])

  return {
    zIndex,
    modalContentProps,
    overlayProps,
    modalProps,
    isHighestModal,
  }
}
