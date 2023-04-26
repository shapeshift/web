import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type Web3 from 'web3'
import type { SwapSource, Trade } from 'lib/swapper/api'
import type {
  ZrxSupportedChainAdapter,
  ZrxSupportedChainId,
} from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export type ZrxCommonResponse = {
  price: string
  gasPrice: string
  buyAmount: string
  sellAmount: string
  allowanceTarget: string
  sources: SwapSource[]
}

export type ZrxPriceResponse = ZrxCommonResponse & {
  estimatedGas: string
}

export type ZrxQuoteResponse = ZrxCommonResponse & {
  to: string
  data: string
  gas: string
}

export interface ZrxTrade<T extends ZrxSupportedChainId> extends Trade<T> {
  txData: string
  depositAddress: string
}

export type ZrxExecuteTradeInput<T extends ZrxSupportedChainId> = {
  trade: ZrxTrade<T>
  wallet: HDWallet
}

export type ZrxSwapperDeps = {
  adapter: ZrxSupportedChainAdapter
  web3: Web3
}
