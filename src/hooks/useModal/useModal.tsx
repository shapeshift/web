import { useContext } from 'react'
import { ModalContext } from 'context/ModalProvider/ModalContext'
import type { ModalState, ModalStateType } from 'context/ModalProvider/ModalProvider'

// for testing
export function makeUseModal<C extends ModalState<T>, T>(context: React.Context<C>) {
  return function () {
    const c = useContext<C>(context)
    if (!c) throw new Error('useModal hook cannot be used outside of the modal provider')
    return c
  }
}

export function useModal() {
  return useContext(ModalContext as React.Context<ModalStateType>)
}
