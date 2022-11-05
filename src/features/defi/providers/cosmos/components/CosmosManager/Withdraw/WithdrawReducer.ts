import { KnownChainIds, WithdrawType } from '@keepkey/types'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn } from 'lib/bignumber/bignumber'

import type { CosmosWithdrawActions, CosmosWithdrawState } from './WithdrawCommon'
import { CosmosWithdrawActionType } from './WithdrawCommon'

export const initialState: CosmosWithdrawState = {
  txid: null,
  cosmosOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.CosmosMainnet,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    tvl: bn(0),
  },
  userAddress: null,
  loading: false,
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
    withdrawType: WithdrawType.DELAYED,
  },
}

export const reducer = (state: CosmosWithdrawState, action: CosmosWithdrawActions) => {
  switch (action.type) {
    case CosmosWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, CosmosOpportunity: { ...state.cosmosOpportunity, ...action.payload } }
    case CosmosWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case CosmosWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case CosmosWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case CosmosWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
