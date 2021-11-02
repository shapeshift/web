import { Asset, ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { filterAssetsBySearchTerm } from './filterAssetsBySearchTerm'

const assets: Asset[] = [
  {
    caip19: 'eip155:1/slip44:60',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    slip44: 60,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/eth@2x.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    caip19: ''
  },
  {
    caip19: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.MAINNET,
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    slip44: 0,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coincap.io/assets/icons/btc@2x.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    sendSupport: false,
    receiveSupport: false,
    caip19: ''
  },
  {
    caip19: 'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    name: 'Aave AMM DAI',
    precision: 18,
    tokenId: '0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/17197/thumb/aAMMDAI_2x.png?1626940032',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'AAMMDAI',
    caip19: ''
  },
  {
    caip19: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    name: 'Dai',
    precision: 18,
    tokenId: '0x6b175474e89094c44da98b954eedeac495271d0f',
    contractType: ContractTypes.ERC20,
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'DAI',
    caip19: ''
  }
]

describe('filterAssetsBySearchTerm', () => {
  it('returns based on symbol', () => {
    const returnedAssets = filterAssetsBySearchTerm('btc', assets)
    expect(returnedAssets[0].symbol).toBe('BTC')
  })

  it('returns based on displayName', () => {
    const returnedAssets = filterAssetsBySearchTerm('Bitcoin', assets)
    expect(returnedAssets[0].name).toBe('Bitcoin')
  })

  it('returns based on address', () => {
    const returnedAssets = filterAssetsBySearchTerm(assets[0]?.tokenId ?? '', assets)
    expect(returnedAssets[0].symbol).toBe('AAMMDAI')
  })

  it('returns closest match instead of the first one in the array', () => {
    const returnedAssets = filterAssetsBySearchTerm('DAI', assets)
    expect(returnedAssets[0].symbol).toBe('DAI')
  })
})
