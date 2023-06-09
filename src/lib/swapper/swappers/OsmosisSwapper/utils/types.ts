import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import type { TradeResult } from 'lib/swapper/api'

export type OsmoSwapperDeps = {
  adapterManager: ChainAdapterManager
  osmoUrl: string
  cosmosUrl: string
}

export type IbcTransferInput = {
  sender: string
  receiver: string
  amount: string
}

export type PoolInfo = {
  pool_assets: PoolAssetInfo[]
  pool_params: {
    swap_fee: string
  }
}

export type PoolRateInfo = {
  rate: string
  priceImpact: string
  buyAssetTradeFeeCryptoBaseUnit: string
  buyAmountCryptoBaseUnit: string
}

export type PoolAssetInfo = {
  token: {
    amount: string
  }
}

export interface OsmosisTradeResult extends TradeResult {
  previousCosmosTxid: string
  cosmosAddress?: string
}
