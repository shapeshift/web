import noop from 'lodash/noop'
import React, { useCallback, useMemo, useReducer } from 'react'
import { WipeModal } from 'components/Layout/Header/NavBar/KeepKey/Modals/Wipe'
import { BackupPassphraseModal } from 'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
import { AssetSearchModal } from 'components/Modals/AssetSearch/AssetSearchModal'
import { FeedbackAndSupport } from 'components/Modals/FeedbackSupport/FeedbackSupport'
import { FiatRampsModal } from 'components/Modals/FiatRamps/FiatRampsModal'
import { MobileWelcomeModal } from 'components/Modals/MobileWelcome/MobileWelcomeModal'
import { NativeOnboarding } from 'components/Modals/NativeOnboarding/NativeOnboarding'
import { NftModal } from 'components/Modals/Nfts/NftModal'
import { PopupWindowModal } from 'components/Modals/PopupWindowModal'
import { QrCodeModal } from 'components/Modals/QrCode/QrCode'
import { ReceiveModal } from 'components/Modals/Receive/Receive'
import { SendModal } from 'components/Modals/Send/Send'
import { SettingsModal } from 'components/Modals/Settings/Settings'
import { AddAccountModal } from 'pages/Accounts/AddAccountModal'

import { ModalContext } from './ModalContext'

// to add new modals, add a new key: value pair below
// the key is the name returned by the hook and the
// component is the modal to be rendered
const MODALS = {
  receive: ReceiveModal,
  qrCode: QrCodeModal,
  send: SendModal,
  fiatRamps: FiatRampsModal,
  settings: SettingsModal,
  keepKeyWipe: WipeModal,
  backupNativePassphrase: BackupPassphraseModal,
  mobileWelcomeModal: MobileWelcomeModal,
  addAccount: AddAccountModal,
  assetSearch: AssetSearchModal,
  popup: PopupWindowModal,
  nativeOnboard: NativeOnboarding,
  nft: NftModal,
  feedbackSupport: FeedbackAndSupport,
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

export function createInitialState<S extends {}>(modalSetup: S): ModalState<S> {
  const modalMethods = { isOpen: false, open: noop, close: noop }
  const modalNames = Object.keys(modalSetup) as (keyof S)[]
  const result = modalNames.reduce(
    (acc, modalName) => ({
      ...acc,
      [modalName]: {
        ...modalMethods,
        Component: modalSetup[modalName],
      },
    }),
    {} as ModalState<S>,
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
        [action.name]: { ...state[action.name], isOpen: true, props: action.props },
      }
    case CLOSE_MODAL:
      return { ...state, [action.name]: { ...state[action.name], isOpen: false } }
    default:
      return state
  }
}

type ModalProviderProps = {
  children: React.ReactNode
}

type CreateModalProviderProps<M> = {
  instanceInitialState: M
  instanceReducer: (state: M, action: ModalActions<M>) => M
  InstanceModalContext: React.Context<M>
}
export type ModalStateType = typeof initialState
// provider
export function createModalProvider<M extends {}>({
  instanceInitialState,
  instanceReducer,
  InstanceModalContext,
}: CreateModalProviderProps<M>) {
  return ({ children }: ModalProviderProps) => {
    const [state, dispatch] = useReducer(instanceReducer, instanceInitialState)

    const openFactory = useCallback(
      (name: keyof M) => (props: ModalProps<M>) => dispatch({ type: OPEN_MODAL, name, props }),
      [],
    )

    const closeFactory = useCallback(
      (name: keyof M) => () => dispatch({ type: CLOSE_MODAL, name }),
      [],
    )

    const callbacks = useMemo(() => {
      const modalKeys = Object.keys(instanceInitialState) as (keyof M)[]
      return modalKeys.reduce((acc, cur) => {
        const open = openFactory(cur)
        const close = closeFactory(cur)
        return { ...acc, [cur]: { open, close } }
      }, {} as Record<keyof M, { open: (props: ModalProps<M>) => void; close: () => void }>)
    }, [openFactory, closeFactory])

    const value = useMemo(() => {
      const modalKeys = Object.keys(instanceInitialState) as (keyof M)[]
      return modalKeys.reduce((acc, cur) => {
        const { open, close } = callbacks[cur]
        return { ...acc, [cur]: { ...acc[cur], open, close } }
      }, state)
    }, [state, callbacks])

    return (
      <InstanceModalContext.Provider value={value}>
        {children}
        {Object.values(value).map((Modal: any, key) => {
          return Modal.isOpen && <Modal.Component key={key} {...Modal.props} />
        })}
      </InstanceModalContext.Provider>
    )
  }
}

export const ModalProvider = createModalProvider({
  instanceInitialState: initialState,
  instanceReducer: modalReducer,
  InstanceModalContext: ModalContext,
})
