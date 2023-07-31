import { useCallback, useMemo, useReducer } from 'react'

import { CLOSE_MODAL, OPEN_MODAL } from './constants'
import { modalContext } from './ModalContext'
import type { BaseProps, ModalActions, ModalContext, ModalProps, Modals, ModalState } from './types'

type ModalProviderProps = {
  children: React.ReactNode
}

type CreateModalProviderInnerProps<T extends keyof Modals> = {
  key: T
  Component: Modals[T]
}

export const modalReducer = <T extends keyof Modals>(
  state: ModalState<T>,
  action: ModalActions<T>,
): ModalState<T> => {
  switch (action.type) {
    case OPEN_MODAL:
      return { isOpen: true, props: action.props }
    case CLOSE_MODAL:
      return { isOpen: false }
    default:
      return state
  }
}

export const createModalProviderInner = <T extends keyof Modals>({
  key,
  Component,
}: CreateModalProviderInnerProps<T>) => {
  const { Provider } = modalContext[key] as ModalContext[T]

  return ({ children }: ModalProviderProps) => {
    const [state, dispatch] = useReducer(
      (state: ModalState<T>, action: ModalActions<T>): ModalState<T> => modalReducer(state, action),
      { isOpen: false },
    )
    const open = useCallback((props: ModalProps<T>) => dispatch({ type: OPEN_MODAL, props }), [])
    const close = useCallback(() => dispatch({ type: CLOSE_MODAL }), [])

    const value: BaseProps<T> = useMemo(() => {
      return { open, close, isOpen: state.isOpen, props: state.props }
    }, [close, open, state])

    return (
      <Provider key={key} value={value}>
        {children}
        {/* @ts-ignore ts not smart enough to know React.ComponentProps<Modals[T]> are props for Modals[T] */}
        {state.isOpen && <Component {...state.props} />}
      </Provider>
    )
  }
}
