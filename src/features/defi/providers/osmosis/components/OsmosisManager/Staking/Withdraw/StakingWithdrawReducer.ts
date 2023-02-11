import { KnownChainIds, WithdrawType } from '@shapeshiftoss/types'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn } from 'lib/bignumber/bignumber'

import type {
  OsmosisStakingWithdrawActions,
  OsmosisStakingWithdrawState,
} from './StakingWithdrawCommon'
import { OsmosisStakingWithdrawActionType } from './StakingWithdrawCommon'

export const initialState: OsmosisStakingWithdrawState = {
  txid: null,
  osmosisOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.OsmosisMainnet,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    tvl: bn(0),
  },
  accountId: null,
  loading: false,
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    txStatus: 'pending',
    usedGasFee: '',
    withdrawType: WithdrawType.DELAYED,
  },
}

export const reducer = (
  state: OsmosisStakingWithdrawState,
  action: OsmosisStakingWithdrawActions,
) => {
  switch (action.type) {
    case OsmosisStakingWithdrawActionType.SET_OPPORTUNITY:
      return { ...state, OsmosisOpportunity: { ...state.osmosisOpportunity, ...action.payload } }
    case OsmosisStakingWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case OsmosisStakingWithdrawActionType.SET_ACCOUNT_ID:
      return { ...state, accountId: action.payload }
    case OsmosisStakingWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisStakingWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
