import { Asset, AssetDataSource, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { createStore } from 'redux'

export const initialAsset: Asset = {
  caip2: '',
  caip19: '',
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: '',
  name: '',
  precision: 18,
  color: '',
  secondaryColor: '',
  icon: '',
  sendSupport: true,
  receiveSupport: true,
  slip44: 60,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: '',
  dataSource: AssetDataSource.CoinGecko,
  description: ''
}

export function feedAssetStore(asset: Asset) {
  return {
    type: 'SET_ASSET',
    asset
  }
}

export function reducer(state = initialAsset, action: any) {
  if (action.type === 'SET_ASSET') {
    return (state = action.asset)
  }
}

export const assetStore = createStore(reducer)
