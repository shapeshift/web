import type { cosmos, osmosis } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'

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

export type OsmosisSupportedChainId = KnownChainIds.CosmosMainnet | KnownChainIds.OsmosisMainnet

export type OsmosisSupportedChainAdapter = cosmos.ChainAdapter | osmosis.ChainAdapter
