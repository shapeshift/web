import { KnownChainIds } from '@shapeshiftoss/types'

import type { FoxyDepositActions, FoxyDepositState } from './DepositCommon'
import { FoxyDepositActionType } from './DepositCommon'

import { bn } from '@/lib/bignumber/bignumber'
import { DefiType } from '@/state/slices/opportunitiesSlice/types'

export const initialState: FoxyDepositState = {
  txid: null,
  foxyOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.EthereumMainnet,
    type: DefiType.Staking,
    expired: true,
    version: '',
    rewardToken: '',
    tvl: bn(0),
    apy: '',
  },
  loading: false,
  approve: {},
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFeeCryptoBaseUnit: '',
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
