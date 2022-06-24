import { DefiType } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds, WithdrawType } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { FoxyWithdrawActions, FoxyWithdrawActionType, FoxyWithdrawState } from './WithdrawCommon'

export const initialState: FoxyWithdrawState = {
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
    tvl: bnOrZero(0),
    apy: '',
  },
  userAddress: null,
  loading: false,
  approve: {},
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
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
    case FoxyWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
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
