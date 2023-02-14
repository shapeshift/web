import { KnownChainIds } from '@shapeshiftoss/types'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type {
  OsmosisStakingDepositActions,
  OsmosisStakingDepositState,
} from './StakingDepositCommon'
import { OsmosisStakingDepositActionType } from './StakingDepositCommon'

export const initialState: OsmosisStakingDepositState = {
  txid: null,
  osmosisOpportunity: {
    stakingToken: '',
    provider: '',
    chain: KnownChainIds.OsmosisMainnet,
    type: DefiType.TokenStaking,
    expired: false,
    version: '',
    tvl: bn(0),
    apr: '',
  },
  accountId: null,
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
  state: OsmosisStakingDepositState,
  action: OsmosisStakingDepositActions,
): OsmosisStakingDepositState => {
  switch (action.type) {
    case OsmosisStakingDepositActionType.SET_OPPORTUNITY:
      return {
        ...state,
        osmosisOpportunity: {
          ...state.osmosisOpportunity,
          ...action.payload,
          tvl: bnOrZero(action.payload?.tvl),
        },
      }
    case OsmosisStakingDepositActionType.SET_DEPOSIT:
      return { ...state, deposit: { ...state.deposit, ...action.payload } }
    case OsmosisStakingDepositActionType.SET_ACCOUNT_ID:
      return { ...state, accountId: action.payload }
    case OsmosisStakingDepositActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case OsmosisStakingDepositActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
