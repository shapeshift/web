import { KnownChainIds } from '@keepkey/types'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type { CosmosDepositActions, CosmosDepositState } from './DepositCommon'
import { CosmosDepositActionType } from './DepositCommon'

export const initialState: CosmosDepositState = {
  txid: null,
  cosmosOpportunity: {
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.CosmosMainnet,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    tvl: bn(0),
    apr: '',
  },
  userAddress: null,
  loading: false,
  pricePerShare: '',
  deposit: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
  },
}

export const reducer = (
  state: CosmosDepositState,
  action: CosmosDepositActions,
): CosmosDepositState => {
  switch (action.type) {
    case CosmosDepositActionType.SET_OPPORTUNITY:
      return {
        ...state,
        cosmosOpportunity: {
          ...state.cosmosOpportunity,
          ...action.payload,
          tvl: bnOrZero(action.payload?.tvl),
        },
      }
    case CosmosDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case CosmosDepositActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case CosmosDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case CosmosDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
