import merge from 'lodash/merge'
import noop from 'lodash/noop'
import React, { useContext, useMemo, useReducer } from 'react'
import { PassphraseModal } from 'components/Modals/KeyManagement/KeepKey/Passphrase'
import { PinModal } from 'components/Modals/KeyManagement/KeepKey/Pin'
import { ReceiveModal } from 'components/Modals/Receive/Receive'
import { SendModal } from 'components/Modals/Send/Send'

// to add new modals, add a new key: value pair below
// the key is the name returned by the hook and the
// component is the modal to be rendered
const MODALS = {
  keepkeyPin: PinModal,
  keepkeyPassphrase: PassphraseModal,
  receive: ReceiveModal,
  send: SendModal
}

// state
export type ModalState<M> = {
  [K in keyof M]: {
    Component: ModalComponents<M>[K]
    props: ModalProps<M>[K]
    open: (props: ModalProps<M>[K]) => void
    close: () => void
    isOpen: boolean
  }
}

// helpers for state type
type ModalComponents<M> = {
  [k in keyof M]: M[k]
}
type ModalProps<M extends ModalSetup<M>> = {
  [k in keyof M]: React.ComponentProps<M[k]>
}

// action types
type ModalActions<M extends ModalSetup<M>> = OpenModalType<M> | CloseModalType<M>

const OPEN_MODAL = 'OPEN_MODAL'
const CLOSE_MODAL = 'CLOSE_MODAL'

type OpenModalType<M extends ModalState<M>> = {
  type: typeof OPEN_MODAL
  name: keyof M
  props: ModalProps<M>
}

type CloseModalType<M> = {
  type: typeof CLOSE_MODAL
  name: keyof M
}

type ModalSetup<S extends ModalSetup<S>> = {
  [k in keyof S]: ModalState<S>[k]['Component']
}

export function createInitialState<S>(modalSetup: S): ModalState<S> {
  const modalMethods = { isOpen: false, open: noop, close: noop }
  const modalNames = Object.keys(modalSetup) as (keyof S)[]
  const result = modalNames.reduce(
    (acc, modalName) => ({
      ...acc,
      [modalName]: {
        ...modalMethods,
        Component: modalSetup[modalName]
      }
    }),
    {} as ModalState<S>
  )
  return result
}

// state
const initialState = createInitialState(MODALS)

// reducer
export function modalReducer<S>(state: S, action: ModalActions<S>): S {
  switch (action.type) {
    case OPEN_MODAL:
      return {
        ...state,
        [action.name]: { ...state[action.name], isOpen: true, props: action.props }
      }
    case CLOSE_MODAL:
      return { ...state, [action.name]: { ...state[action.name], isOpen: false } }
    default:
      return state
  }
}

// testability
export function createModalContext<M>(state: M) {
  return React.createContext<M>(state)
}

// context
// If initial state is removed/set to null, the KeepKey wallet modals will break
export const ModalContext = createModalContext(initialState)

type ModalProviderProps = {
  children: React.ReactNode
}

type CreateModalProviderProps<M> = {
  instanceInitialState: M
  instanceReducer: (state: M, action: ModalActions<M>) => M
  InstanceModalContext: React.Context<M>
}
// provider
export function createModalProvider<M>({
  instanceInitialState,
  instanceReducer,
  InstanceModalContext
}: CreateModalProviderProps<M>) {
  return ({ children }: ModalProviderProps) => {
    const [state, dispatch] = useReducer(instanceReducer, instanceInitialState)

    const openFactory = useMemo(
      () => (name: keyof M) => (props: ModalProps<M>) =>
        dispatch({ type: OPEN_MODAL, name, props }),
      []
    )

    const closeFactory = useMemo(
      () => (name: keyof M) => () => dispatch({ type: CLOSE_MODAL, name }),
      []
    )

    const value = useMemo(() => {
      const modalKeys = Object.keys(instanceInitialState) as (keyof M)[]
      const fns = modalKeys.reduce((acc, cur) => {
        const open = openFactory(cur)
        const close = closeFactory(cur)
        return { ...acc, [cur]: { open, close } }
      }, state)
      const result = merge(state, fns)
      return result
    }, [state, closeFactory, openFactory])

    return (
      <InstanceModalContext.Provider value={value}>
        {children}
        {Object.values(value).map(
          (Modal, key) => Modal.isOpen && <Modal.Component key={key} {...Modal.props} />
        )}
      </InstanceModalContext.Provider>
    )
  }
}

export const ModalProvider = createModalProvider({
  instanceInitialState: initialState,
  instanceReducer: modalReducer,
  InstanceModalContext: ModalContext
})

// for testing
export function makeUseModal<C extends ModalState<T>, T>(context: React.Context<C>) {
  return function () {
    const c = useContext<C>(context)
    if (!c) throw new Error('useModal hook cannot be used outside of the modal provider')
    return c
  }
}

// hook
export const useModal = makeUseModal(ModalContext)
