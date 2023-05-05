import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Trade } from 'lib/swapper/api'

export type OneInchQuoteApiInput = {
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  fee: number // fee as a percentage, e.g. to set a fee to 1.5%: fee=1.5
}

// https://docs.1inch.io/docs/aggregation-protocol/api/swap-params/
export type OneInchSwapApiInput = OneInchQuoteApiInput & {
  slippage: number
  fromAddress: string
  referrerAddress: string
  allowPartialFill: boolean
  disableEstimate: boolean
  fee: number // fee as a percentage, e.g. to set a fee to 1.5%: fee=1.5, paid to the referrerAddress
}

export type OneInchAllowanceApiInput = {
  tokenAddress: string
  walletAddress: string
}

export type OneInchAllowanceResponse = {
  allowance: string
}

export type OneInchSpenderResponse = {
  address: string
}

export type OneInchTokenResponse = {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI: string
}

export type OneInchQuoteResponse = OneInchBaseResponse & {
  estimatedGas: string
}

export type OneInchSwapResponse = OneInchBaseResponse & {
  tx: EvmTransaction
}

export type OneInchBaseResponse = {
  fromToken: OneInchTokenResponse
  toToken: OneInchTokenResponse
  toTokenAmount: string
  fromTokenAmount: string
}

export type OneInchSwapperDeps = {
  apiUrl: string
}

export type EvmTransaction = {
  from: string
  to: string
  data: string
  value: string
  gasPrice: string
  gas: string
}

export interface OneInchTrade<T extends EvmChainId> extends Trade<T> {
  tx: EvmTransaction
}

export type OneInchExecuteTradeInput<T extends EvmChainId> = {
  trade: OneInchTrade<T>
  wallet: HDWallet
}
