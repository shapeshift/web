import { DefiType } from '@keepkey/investor-foxy'
import { KnownChainIds } from '@keepkey/types'
import { bn } from 'lib/bignumber/bignumber'

import type { FoxyDepositActions, FoxyDepositState } from './DepositCommon'
import { FoxyDepositActionType } from './DepositCommon'

export const initialState: FoxyDepositState = {
  txid: null,
  foxyOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.EthereumMainnet,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    rewardToken: '',
    tvl: bn(0),
    apy: '',
  },
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
  isExactAllowance: false,
}

export const reducer = (state: FoxyDepositState, action: FoxyDepositActions) => {
  switch (action.type) {
    case FoxyDepositActionType.SET_OPPORTUNITY:
      return { ...state, foxyOpportunity: { ...state.foxyOpportunity, ...action.payload } }
    case FoxyDepositActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxyDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case FoxyDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case FoxyDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxyDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    case FoxyDepositActionType.SET_IS_EXACT_ALLOWANCE:
      return { ...state, isExactAllowance: action.payload }
    default:
      return state
  }
}
