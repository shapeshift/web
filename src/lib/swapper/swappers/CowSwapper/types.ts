import type { ChainId } from '@shapeshiftoss/caip'
import type { ethereum, gnosis } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Trade, TradeResult } from 'lib/swapper/api'

import type { CowSwapOrder } from './utils/helpers/helpers'

export type CowSwapQuoteResponse = {
  quote: {
    sellToken: string
    buyToken: string
    receiver: string
    sellAmount: string
    buyAmount: string
    validTo: number
    appData: string
    feeAmount: string
    kind: string
    partiallyFillable: boolean
  }
  from: string
  expiration: string
  id: string
}

export enum CowNetwork {
  Mainnet = 'mainnet',
  Xdai = 'xdai',
}

export type CowChainId = KnownChainIds.EthereumMainnet | KnownChainIds.GnosisMainnet

export type CowSupportedChainAdapter = ethereum.ChainAdapter | gnosis.ChainAdapter

export type CowSwapGetOrdersResponse = {
  status: string
}

export type CowSwapGetTradesResponse = {
  txHash: string
}[]

export type CowSwapGetTransactionsResponse = {
  status: 'presignaturePending' | 'open' | 'fulfilled' | 'cancelled' | 'expired'
}[]

export interface CowTrade<C extends CowChainId> extends Trade<C> {
  feeAmountInSellTokenCryptoBaseUnit: string
  sellAmountDeductFeeCryptoBaseUnit: string
  minimumBuyAmountAfterFeesCryptoBaseUnit: string
  id: string
}

export interface CowTradeResult extends TradeResult {
  chainId: ChainId
}

export type CowSignTx = { orderToSign: CowSwapOrder; messageToSign: ETHSignMessage }
