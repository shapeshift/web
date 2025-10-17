import { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { useModalStack } from './ModalStackProvider'

export type UseModalRegistrationProps = {
  isOpen: boolean
  onClose: () => void
}
const ZINDEX_BUFFER = 10

export const useModalRegistration = ({ isOpen, onClose }: UseModalRegistrationProps) => {
  const { registerModal, unregisterModal, getIsHighestModal, getZIndex } = useModalStack()
  const [modalId] = useState(uuidv4())

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
              zIndex: `calc(var(--chakra-zIndices-modal) + ${zIndex + ZINDEX_BUFFER})`,
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
            // Overlay is 1 zindex less than the modal to avoid stacking issues
            zIndex: `calc(var(--chakra-zIndices-modal) + ${zIndex + ZINDEX_BUFFER - 1})`,
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
