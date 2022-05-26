import { DefiType } from '@shapeshiftoss/investor-foxy'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { FoxyDepositActions, FoxyDepositActionType, FoxyDepositState } from './DepositCommon'

export const initialState: FoxyDepositState = {
  txid: null,
  foxyOpportunity: {
    contractAddress: '',
    stakingToken: '',
    provider: '',
    chain: ChainTypes.Ethereum,
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
}

export const reducer = (state: FoxyDepositState, action: FoxyDepositActions) => {
  switch (action.type) {
    case FoxyDepositActionType.SET_OPPORTUNITY:
      const apy = bnOrZero(getConfig().REACT_APP_FOXY_APY).toString() // delete when Tokemak api is setup
      return { ...state, foxyOpportunity: { ...state.foxyOpportunity, ...action.payload, apy } }
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
    default:
      return state
  }
}
