import { useCallback, useMemo, useReducer } from 'react'

import { CLOSE_MODAL, OPEN_MODAL } from './constants'
import { ModalContext, modalReducer, MODALS } from './ModalContainer'
import type { ModalContextType, ModalProps, Modals, ModalState } from './types'

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialState: ModalState = Object.keys(MODALS).reduce((acc, key) => {
    acc[key as keyof Modals] = { isOpen: false }
    return acc
  }, {} as ModalState)

  const [state, dispatch] = useReducer(modalReducer, initialState)

  const openModal = useCallback(<T extends keyof Modals>(key: T, props: ModalProps<T>) => {
    dispatch({ type: OPEN_MODAL, key, props })
  }, [])

  const closeModal = useCallback((key: keyof Modals) => {
    dispatch({ type: CLOSE_MODAL, key })
  }, [])

  const value = useMemo<ModalContextType>(
    () => ({
      state,
      openModal,
      closeModal,
    }),
    [state, openModal, closeModal],
  )

  const modals = useMemo(
    () =>
      Object.entries(MODALS).map(([key, Component]) => {
        const modalState = state[key as keyof Modals]
        // @ts-ignore ts not smart enough to know React.ComponentProps<Modals[T]> are props for Modals[T]
        return modalState.isOpen ? <Component key={key} {...modalState.props} /> : null
      }),
    [state],
  )

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modals}
    </ModalContext.Provider>
  )
}
