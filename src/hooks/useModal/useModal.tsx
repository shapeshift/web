import { useContext, useMemo } from 'react'
import { ModalContext } from 'context/ModalProvider/ModalContainer'
import type { BaseProps, ModalProps, Modals } from 'context/ModalProvider/types'

export const useModal = <T extends keyof Modals>(key: T): BaseProps<T> => {
  const context = useContext(ModalContext)

  if (!context) {
    throw new Error('useModal must be used within ModalProvider')
  }
  const { state, openModal, closeModal } = context
  const modalState = state[key]

  return useMemo(
    () => ({
      isOpen: modalState.isOpen,
      props: modalState.props,
      open: (props: ModalProps<T>) => openModal(key, props),
      close: () => closeModal(key),
    }),
    [modalState, openModal, closeModal, key],
  )
}
