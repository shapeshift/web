import { KnownChainIds } from '@shapeshiftoss/types'

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
