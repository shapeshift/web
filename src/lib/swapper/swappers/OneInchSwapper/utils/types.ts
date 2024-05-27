import { KnownChainIds } from '@shapeshiftoss/types'

export const oneInchSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
] as const

export type OneInchSupportedChainId = (typeof oneInchSupportedChainIds)[number]

export type OneInchQuoteApiInput = {
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
  receiver: string
  fee?: number // fee as a percentage, e.g. to set a fee to 1.5%: fee=1.5, paid to the referrerAddress
}

// https://docs.1inch.io/docs/aggregation-protocol/api/swap-params/
export type OneInchSwapApiInput = OneInchQuoteApiInput & {
  slippage: number
  fromAddress: string
  referrerAddress?: string
  allowPartialFill: boolean
  disableEstimate: boolean
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

export type EvmTransaction = {
  from: string
  to: string
  data: string
  value: string
  gasPrice: string
  gas: string
}
