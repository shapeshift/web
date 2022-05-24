import { YearnDepositActions, YearnDepositActionType, YearnDepositState } from './DepositCommon'

export const initialState: YearnDepositState = {
  txid: null,
  opportunity: null,
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (state: YearnDepositState, action: YearnDepositActions) => {
  switch (action.type) {
    case YearnDepositActionType.SET_VAULT:
      return { ...state, vault: { ...state.opportunity, ...action.payload } }
    case YearnDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case YearnDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case YearnDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnDepositActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
