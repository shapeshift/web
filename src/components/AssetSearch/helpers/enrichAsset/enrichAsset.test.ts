import { Asset, AssetDataSource, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { MarketDataState } from 'state/slices/marketDataSlice/marketDataSlice'
import { AccountRowData } from 'state/slices/portfolioSlice/selectors'

import { enrichAsset } from './enrichAsset'

const assets: Asset[] = [
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    chain: ChainTypes.Ethereum,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.MAINNET,
    name: 'Aave AMM DAI',
    precision: 18,
    tokenId: '0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    contractType: 'erc20',
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/17197/thumb/aAMMDAI_2x.png?1626940032',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'AAMMDAI',
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    chain: ChainTypes.Ethereum,
    dataSource: AssetDataSource.CoinGecko,
    network: NetworkTypes.MAINNET,
    name: 'Dai',
    precision: 18,
    tokenId: '0x6b175474e89094c44da98b954eedeac495271d0f',
    contractType: 'erc20',
    color: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774',
    slip44: 60,
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    sendSupport: true,
    receiveSupport: true,
    symbol: 'DAI',
  },
]

const rowData: AccountRowData[] = [
  {
    name: 'Dai',
    icon: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774',
    symbol: 'DAI',
    fiatAmount: '29',
    cryptoAmount: '9.00022389',
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    allocation: 2939,
    price: '1',
    priceChange: 2,
  },
  {
    assetId: 'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    name: 'Aave AMM DAI',
    icon: 'https://assets.coingecko.com/coins/images/17197/thumb/aAMMDAI_2x.png?1626940032',
    symbol: 'AAMMDAI',
    allocation: 2939,
    price: '1',
    priceChange: 2,
    fiatAmount: '10',
    cryptoAmount: '9.00022389',
  },
]

const marketData: MarketDataState = {
  crypto: {
    byId: {
      'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f': {
        marketCap: '39939393',
        price: '1',
        volume: '',
        changePercent24Hr: 3,
      },
      'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4': {
        marketCap: '20392093290',
        price: '1',
        volume: '',
        changePercent24Hr: 3,
      },
    },
    priceHistory: {
      '1H': { AssetId: undefined },
      '1M': { AssetId: undefined },
      '1W': { AssetId: undefined },
      '1Y': { AssetId: undefined },
      '24H': { AssetId: undefined },
      All: { AssetId: undefined },
    },
    ids: [],
  },
  fiat: {
    byId: {},
    priceHistory: {
      '1H': { AssetId: undefined },
      '1M': { AssetId: undefined },
      '1W': { AssetId: undefined },
      '1Y': { AssetId: undefined },
      '24H': { AssetId: undefined },
      All: { AssetId: undefined },
    },
    ids: [],
  },
}

describe('enrichAsset', () => {
  it('check that all the element in the array have a valid cryptoAmount property', () => {
    const returnedAssets = enrichAsset(assets, rowData, marketData)
    // check that all the element in the array have a valid cryptoAmount and marketCap property

    const firstAsset = returnedAssets[0] as any
    const secondAsset = returnedAssets[1] as any
    expect(Number(firstAsset.cryptoAmount)).toEqual(Number(rowData[1].cryptoAmount))

    expect(Number(secondAsset.cryptoAmount)).toEqual(Number(rowData[0].cryptoAmount))
  })

  it('check that all the element in the array have a valid marketCap property', () => {
    const returnedAssets = enrichAsset(assets, rowData, marketData)

    const firstAsset = returnedAssets[0] as any
    const secondAsset = returnedAssets[1] as any
    expect(Number(firstAsset.marketCap)).toEqual(
      Number(marketData.crypto.byId[firstAsset.assetId]?.marketCap),
    )

    expect(Number(secondAsset.marketCap)).toEqual(
      Number(marketData.crypto.byId[secondAsset.assetId]?.marketCap),
    )
  })
})
