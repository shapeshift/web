import type { SessionTypes } from '@walletconnect/types'
import type { WalletConnectAction, WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'
import type { PartialRecord } from 'lib/utils'

export const walletConnectReducer = (
  state: WalletConnectState,
  action: WalletConnectAction,
): WalletConnectState => {
  switch (action.type) {
    case WalletConnectActionType.INITIALIZE:
      return { ...state, ...action.payload }
    case WalletConnectActionType.SET_MODAL:
      return { ...state, activeModal: action.payload.modal, modalData: action.payload.data }
    case WalletConnectActionType.CLEAR_MODAL:
      return { ...state, activeModal: undefined, modalData: undefined }
    case WalletConnectActionType.SET_SESSIONS: {
      const sessionsByTopic = action.payload.reduce<PartialRecord<string, SessionTypes.Struct>>(
        (acc, session) => {
          acc[session.topic] = session
          return acc
        },
        {},
      )
      return { ...state, sessionsByTopic }
    }
    case WalletConnectActionType.DELETE_SESSION: {
      // A modal can't exist without a session. Ensure it's closed when removing the session.
      state.sessionsByTopic[action.payload.topic] = undefined
      state.activeModal = undefined
      return {
        ...state,
        sessionsByTopic: {
          ...state.sessionsByTopic,
          [action.payload.topic]: undefined,
        },
      }
    }
    case WalletConnectActionType.UPDATE_SESSION: {
      const session = state.sessionsByTopic[action.payload.topic]

      if (session === undefined) return state

      return {
        ...state,
        sessionsByTopic: {
          ...state.sessionsByTopic,
          [session.topic]: { ...session, ...action.payload },
        },
      }
    }
    case WalletConnectActionType.ADD_SESSION: {
      return {
        ...state,
        sessionsByTopic: { ...state.sessionsByTopic, [action.payload.topic]: action.payload },
      }
    }
    default:
      return state
  }
}
