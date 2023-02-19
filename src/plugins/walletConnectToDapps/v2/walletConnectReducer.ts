import type { WalletConnectAction, WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { WalletConnectActionType } from 'plugins/walletConnectToDapps/v2/types'

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
    case WalletConnectActionType.SET_SESSION:
      return { ...state, session: action.payload }
    case WalletConnectActionType.DELETE_SESSION:
      return { ...state, session: undefined }
    case WalletConnectActionType.UPDATE_SESSION:
      const { session } = state
      // A session cannot be updated if it is not initialized
      return session ? { ...state, session: { ...session, ...action.payload } } : state
    default:
      return state
  }
}
