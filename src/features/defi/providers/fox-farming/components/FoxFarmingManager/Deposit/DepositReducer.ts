import type { FoxFarmingDepositActions, FoxFarmingDepositState } from './DepositCommon'
import { FoxFarmingDepositActionType } from './DepositCommon'

export const initialState: FoxFarmingDepositState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: FoxFarmingDepositState,
  action: FoxFarmingDepositActions,
): FoxFarmingDepositState => {
  switch (action.type) {
    case FoxFarmingDepositActionType.SET_OPPORTUNITY:
      return { ...state, opportunity: { ...state.opportunity, ...action.payload } }
    case FoxFarmingDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxFarmingDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case FoxFarmingDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case FoxFarmingDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxFarmingDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
