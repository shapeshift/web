import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

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
  poolAssets: PoolAssetInfo[]
  poolParams: {
    swapFee: string
  }
}

export type PoolAssetInfo = {
  token: {
    amount: string
  }
}
