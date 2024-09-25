import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address, TypedData } from 'viem'

export const zrxSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
] as const

export type ZrxSupportedChainId = (typeof zrxSupportedChainIds)[number]

type ZrxSwapSource = {
  name: string
  proportion: string
}

export type ZrxPriceResponse = {
  price: string
  grossPrice: string
  estimatedGas: string
  gas: string
  gasPrice: string
  buyAmount: string
  grossBuyAmount: string
  sellAmount: string
  grossSellAmount: string
  allowanceTarget: string
  sources: ZrxSwapSource[]
  expectedSlippage?: string
  minimumProtocolFee: string
  protocolFee: string
  estimatedPriceImpact: string
  auxiliaryChainData: {
    l1GasEstimate?: number
  }
}

export type ZrxQuoteResponse = ZrxPriceResponse & {
  to: string
  data: string
  value: string
}

type ZrxFee = {
  amount: string
  token: Address
  type: string
}

type ZrxTokenMetadata = {
  buyTaxBps: string | null
  sellTaxBps: string | null
}

export type ZrxPermit2PriceResponse = {
  blockNumber: string
  buyAmount: string
  buyToken: string
  fees: {
    integratorFee: ZrxFee | null
    zeroExFee: ZrxFee | null
    gasFee: ZrxFee | null
  }
  gas: string | null
  gasPrice: string
  issues: {
    allowance: {
      actual: string
      spender: Address
    } | null
    balance: {
      token: Address
      actual: string
      expected: string
    } | null
    simulationIncomplete: boolean
    invalidSourcesPassed: string[]
  }
  liquidityAvailable: boolean
  minBuyAmount: string
  route: {
    fills: {
      from: Address
      to: Address
      source: string
      proportionBps: string
    }
    tokens: {
      address: Address
      symbol: string
    }[]
  }
  sellAmount: string
  sellToken: Address
  tokenMetadata: {
    buyToken: ZrxTokenMetadata
    sellToken: ZrxTokenMetadata
  }
  totalNetworkFee: string | null
  zid: string
}

export type ZrxPermit2QuoteResponse = ZrxPermit2PriceResponse & {
  permit2: {
    type: 'Permit2'
    hash: string
    eip712: TypedData | null
  } | null
  transaction: {
    to: Address
    data: string
    gas: string | null
    gasPrice: string
    value: string
  }
}
