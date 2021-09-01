import { ReceiveModal } from 'components/Modals/Receive/Receive'
import { SendModal } from 'components/Modals/Send/Send'
import noop from 'lodash/noop'
import React, { useCallback, useContext, useReducer } from 'react'
import { useMemo } from 'react'

// consts
export const MODALS = {
  SEND: 'send',
  RECEIVE: 'receive'
} as const

export const OPEN_MODAL = 'OPEN_MODAL'
export const CLOSE_MODAL = 'CLOSE_MODAL'

// typedefs
type Modal = typeof MODALS[keyof typeof MODALS]

type ModalProviderProps = {
  children: React.ReactNode
}

type AllowedPropKeys = 'asset'

type AllowedProps = Record<AllowedPropKeys, any>

type OpenModalType = {
  type: typeof OPEN_MODAL
  name: Modal
  props: AllowedProps
}

type CloseModalType = {
  type: typeof CLOSE_MODAL
  name: Modal
}

type ModalState = {
  props: Record<string, any>
} & Record<Modal, boolean>

type ModalActions = OpenModalType | CloseModalType

type ModalContextProps = {
  close(name: Modal): void
  open(name: Modal, props?: AllowedProps): void
} & ModalState

function validateName(name: Modal) {
  const values = Object.values(MODALS)
  if (!values.includes(name)) {
    throw new Error(`${name} is not a valid modal name`)
  }
}

// reducer
const reducer = (state: ModalState, action: ModalActions) => {
  switch (action.type) {
    case OPEN_MODAL:
      validateName(action.name)
      return { ...state, [action.name]: true, props: action.props }
    case CLOSE_MODAL:
      validateName(action.name)
      return { ...state, [action.name]: false, props: {} }
    default:
      return state
  }
}

// state
const initialState = Object.freeze({
  [MODALS.SEND]: false,
  [MODALS.RECEIVE]: false,
  props: {}
})

// context
export const ModalContext = React.createContext<ModalContextProps>({
  ...initialState,
  close: noop,
  open: noop
})

// provider
export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const open = useCallback(
    (name: Modal, props?: AllowedProps) =>
      dispatch({
        type: OPEN_MODAL,
        name,
        props: props ?? ({} as AllowedProps)
      }),
    [dispatch]
  )

  const close = useCallback(
    (name: Modal) =>
      dispatch({
        type: CLOSE_MODAL,
        name
      }),
    [dispatch]
  )

  const value = useMemo(() => ({ ...state, close, open }), [close, open, state])

  return (
    <ModalContext.Provider value={value}>
      {children}
      <SendModal />
      <ReceiveModal />
    </ModalContext.Provider>
  )
}

// hook
export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) throw new Error('useModal hook cannot be used outside of the modal provider')
  return context
}
