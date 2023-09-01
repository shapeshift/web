import { KnownChainIds } from '@shapeshiftoss/types'

export const zrxSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
] as const

export type ZrxSupportedChainId = typeof zrxSupportedChainIds[number]

type ZrxSwapSource = {
  name: string
  proportion: string
}

export type ZrxCommonResponse = {
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
  expectedSlippage: string
  minimumProtocolFee: string
  protocolFee: string
  estimatedPriceImpact: string
}

export type ZrxPriceResponse = ZrxCommonResponse

export type ZrxQuoteResponse = ZrxCommonResponse & {
  to: string
  data: string
  value: string
}
