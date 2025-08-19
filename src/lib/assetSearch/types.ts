import type { AssetId, ChainId } from '@shapeshiftoss/caip'

export interface SearchableAsset {
  assetId: AssetId
  name: string
  symbol: string
  chainId: ChainId
}

export interface AssetSearchWorkerMessages {
  InitMessage: {
    type: 'init'
    payload: {
      assets: SearchableAsset[]
    }
  }
  UpdateAssetsMessage: {
    type: 'updateAssets'
    payload: {
      assets: SearchableAsset[]
    }
  }
  SearchMessage: {
    type: 'search'
    requestId: number
    payload: {
      searchString: string
      activeChainId: ChainId | 'All'
      allowWalletUnsupportedAssets: boolean | undefined
      walletConnectedChainIds: ChainId[]
    }
  }
  SearchResultMessage: {
    type: 'searchResult'
    requestId: number
    payload: {
      assetIds: AssetId[]
    }
  }
}

export type AssetSearchWorkerInboundMessage =
  | AssetSearchWorkerMessages['InitMessage']
  | AssetSearchWorkerMessages['UpdateAssetsMessage']
  | AssetSearchWorkerMessages['SearchMessage']

export type AssetSearchWorkerOutboundMessage = AssetSearchWorkerMessages['SearchResultMessage']
