import { KnownChainIds, WithdrawType } from '@shapeshiftoss/types'

import type { FoxyWithdrawActions, FoxyWithdrawState } from './WithdrawCommon'
import { FoxyWithdrawActionType } from './WithdrawCommon'

import { bn } from '@/lib/bignumber/bignumber'
import { DefiType } from '@/state/slices/opportunitiesSlice/types'

export const initialState: FoxyWithdrawState = {
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
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFeeCryptoBaseUnit: '',
    withdrawType: WithdrawType.DELAYED,
  },
  foxyFeePercentage: '',
}

export const reducer = (state: FoxyWithdrawState, action: FoxyWithdrawActions) => {
  switch (action.type) {
    case FoxyWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, foxyOpportunity: { ...state.foxyOpportunity, ...action.payload } }
    case FoxyWithdrawActionType.SET_APPROVE:
      return { ...state, approve: action.payload }
    case FoxyWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case FoxyWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case FoxyWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    case FoxyWithdrawActionType.SET_FOXY_FEE:
      return { ...state, foxyFeePercentage: action.payload }
    default:
      return state
  }
}
