import type { WalletConnectAction, WalletConnectState } from 'plugins/walletConnectV2/types'
import { WalletConnectActionType } from 'plugins/walletConnectV2/types'

export const walletConnectReducer = (
  state: WalletConnectState,
  action: WalletConnectAction,
): WalletConnectState => {
  console.log('[debug] reducer', { state, action })
  switch (action.type) {
    case WalletConnectActionType.INITIALIZE:
      return { ...state, ...action.payload }
    case WalletConnectActionType.SET_MODAL:
      return { ...state, activeModal: action.payload.modal, modalData: action.payload.data }
    case WalletConnectActionType.CLEAR_MODAL:
      return { ...state, activeModal: undefined, modalData: undefined }
    case WalletConnectActionType.SET_SESSION:
      return { ...state, session: action.payload.session }
    case WalletConnectActionType.DELETE_SESSION:
      return { ...state, session: undefined }
    default:
      return state
  }
}
