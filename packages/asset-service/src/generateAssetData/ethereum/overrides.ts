import { Asset } from '../../service/AssetService'
import { ethereum } from '../baseAssets'

export const overrideTokens: Asset[] = [
  // example overriding FOX token with custom values instead of goingecko
  {
    assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:1',
    name: 'Fox',
    precision: 18,
    color: '#222E51',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    explorer: ethereum.explorer,
    explorerAddressLink: ethereum.explorerAddressLink,
    explorerTxLink: ethereum.explorerTxLink,
  },
]
