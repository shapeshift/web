import type { FC } from 'react'
import { useMemo, useReducer } from 'react'

import { modalContext } from './ModalContext'

// action types
type ModalActions = OpenModalType | CloseModalType

const OPEN_MODAL = 'OPEN_MODAL'
const CLOSE_MODAL = 'CLOSE_MODAL'

type OpenModalType = {
  type: typeof OPEN_MODAL
  props: React.ComponentProps<FC>
}

type CloseModalType = {
  type: typeof CLOSE_MODAL
}

type ModalState = {
  props?: React.ComponentProps<FC>
  isOpen: boolean
}

type ModalProviderProps = {
  children: React.ReactNode
}

export type BaseProps = {
  isOpen: boolean
  open: (props: React.ComponentProps<FC>) => void
  close: () => void
}

type CreateModalProviderProps = {
  key: string
  Component: FC<any> // TODO: type this properly
}

// reducer
export const modalReducer = (state: ModalState, action: ModalActions): ModalState => {
  switch (action.type) {
    case OPEN_MODAL:
      return { isOpen: true, props: action.props }
    case CLOSE_MODAL:
      return { isOpen: false }
    default:
      return state
  }
}

export const createModalProviderInner = ({ key, Component }: CreateModalProviderProps) => {
  const { Provider } = modalContext[key]

  return ({ children }: ModalProviderProps) => {
    const [state, dispatch] = useReducer(modalReducer, { isOpen: false })

    const value = useMemo(() => {
      const open = (props: React.ComponentProps<FC>) => dispatch({ type: OPEN_MODAL, props })
      const close = () => dispatch({ type: CLOSE_MODAL })
      return { open, close, isOpen: state.isOpen }
    }, [state])

    return (
      <Provider value={value}>
        {children}
        {state.isOpen && <Component {...state.props} />}
      </Provider>
    )
  }
}
