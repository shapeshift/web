import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

export const overrideTokens: Array<Asset> = [
  // example overriding FOX token with custom values instead of goingecko
  {
    assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
    chainId: 'eip155:1',
    name: 'Fox',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/fox@2x.png',
    symbol: 'FOX',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    explorer: 'https://etherscan.io',
    explorerAddressLink: 'https://etherscan.io/address/',
    explorerTxLink: 'https://etherscan.io/tx/'
  }
]
