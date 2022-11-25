import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type Web3 from 'web3'

import { EvmSupportedChainAdapter, EvmSupportedChainIds, SwapSource, Trade } from '../../api'

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

export interface ZrxTrade<T extends EvmSupportedChainIds> extends Trade<T> {
  txData: string
  depositAddress: string
}

export type ZrxExecuteTradeInput<T extends EvmSupportedChainIds> = {
  trade: ZrxTrade<T>
  wallet: HDWallet
}

export type ZrxSwapperDeps = {
  adapter: EvmSupportedChainAdapter
  web3: Web3
}
