import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { SwapSource, Trade } from 'lib/swapper/api'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

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

export interface ZrxTrade extends Trade<ZrxSupportedChainId> {
  txData: string
  depositAddress: string
}

export type ZrxExecuteTradeInput = {
  trade: ZrxTrade
  wallet: HDWallet
}
