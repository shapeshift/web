import { KnownChainIds } from '@shapeshiftoss/types'
import type { SwapSource } from 'lib/swapper/api'

export const zrxSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
] as const

export type ZrxSupportedChainId = typeof zrxSupportedChainIds[number]

export type ZrxCommonResponse = {
  price: string
  estimatedGas: string
  gas: string
  gasPrice: string
  buyAmount: string
  sellAmount: string
  allowanceTarget: string
  sources: SwapSource[]
}

export type ZrxPriceResponse = ZrxCommonResponse

export type ZrxQuoteResponse = ZrxCommonResponse & {
  to: string
  data: string
  value: string
}
