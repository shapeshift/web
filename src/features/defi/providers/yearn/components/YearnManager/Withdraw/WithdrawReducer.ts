import { ChainTypes, WithdrawType } from '@shapeshiftoss/types'

import { YearnWithdrawActions, YearnWithdrawActionType, YearnWithdrawState } from './WithdrawCommon'

export const initialState: YearnWithdrawState = {
  txid: null,
  vault: {
    vaultAddress: '',
    tokenAddress: '',
    provider: '',
    chain: ChainTypes.Ethereum,
    type: '',
    expired: false,
    address: '',
    typeId: 'VAULT_V2',
    token: '',
    name: '',
    version: '',
    symbol: '',
    decimals: '',
    tokenId: '',
    underlyingTokenBalance: {
      amount: '0',
      amountUsdc: '0',
    },
    metadata: {
      symbol: '',
      pricePerShare: '',
      migrationAvailable: false,
      latestVaultAddress: '',
      depositLimit: '',
      emergencyShutdown: false,
      controller: '',
      totalAssets: '',
      totalSupply: '',
      displayName: '',
      displayIcon: '',
      defaultDisplayToken: '',
      hideIfNoDeposits: false,
    },
  },
  userAddress: null,
  loading: false,
  approve: {},
  pricePerShare: '',
  withdraw: {
    fiatAmount: '',
    cryptoAmount: '',
    slippage: '',
    txStatus: 'pending',
    usedGasFee: '',
    withdrawType: WithdrawType.INSTANT,
  },
}

export const reducer = (state: YearnWithdrawState, action: YearnWithdrawActions) => {
  switch (action.type) {
    case YearnWithdrawActionType.SET_VAULT:
      return { ...state, vault: { ...state.vault, ...action.payload } }
    case YearnWithdrawActionType.SET_WITHDRAW:
      return { ...state, withdraw: { ...state.withdraw, ...action.payload } }
    case YearnWithdrawActionType.SET_USER_ADDRESS:
      return { ...state, userAddress: action.payload }
    case YearnWithdrawActionType.SET_LOADING:
      return { ...state, loading: action.payload }
    case YearnWithdrawActionType.SET_PRICE_PER_SHARE:
      return { ...state, pricePerShare: action.payload }
    case YearnWithdrawActionType.SET_TXID:
      return { ...state, txid: action.payload }
    default:
      return state
  }
}
