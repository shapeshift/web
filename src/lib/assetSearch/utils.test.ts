import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { searchAssets } from './utils'

const assets: Asset[] = [
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoin/info/logo.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    name: 'Aave AMM DAI',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/17197/thumb/aAMMDAI_2x.png?1626940032',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    symbol: 'AAMMDAI',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    name: 'Dai',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    symbol: 'DAI',
    relatedAssetKey: null,
  },
]

const stablecoinAssets: Asset[] = [
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    precision: 6,
    color: '#2775CA',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether',
    precision: 6,
    color: '#26A17B',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
    symbol: 'USDS',
    name: 'USDS Stablecoin',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000002',
    symbol: 'axlUSDC',
    name: 'Axelar Wrapped USDC',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000003',
    symbol: 'yvUSDC',
    name: 'Yearn USDC yVault Pool',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
]

describe('searchAssets', () => {
  it('returns based on symbol', () => {
    const returnedAssets = searchAssets('btc', assets)
    expect(returnedAssets[0].symbol).toBe('BTC')
  })

  it('returns based on displayName', () => {
    const returnedAssets = searchAssets('Bitcoin', assets)
    expect(returnedAssets[0].name).toBe('Bitcoin')
  })

  it('returns based on assetId', () => {
    const returnedAssets = searchAssets(
      fromAssetId(assets[2]?.assetId).assetReference ?? '',
      assets,
    )
    expect(returnedAssets[0].symbol).toBe('AAMMDAI')
  })

  it('returns closest match instead of the first one in the array', () => {
    const returnedAssets = searchAssets('DAI', assets)
    expect(returnedAssets[0].symbol).toBe('DAI')
  })

  it('returns empty array for empty assets', () => {
    const returnedAssets = searchAssets('btc', [])
    expect(returnedAssets).toEqual([])
  })

  it('returns all assets when search term is empty', () => {
    const returnedAssets = searchAssets('', assets)
    expect(returnedAssets).toEqual(assets)
  })

  describe('symbol match priority', () => {
    it('prioritizes exact symbol match over prefix match', () => {
      const returnedAssets = searchAssets('usdc', stablecoinAssets)
      expect(returnedAssets[0].symbol).toBe('USDC')
    })

    it('prioritizes symbol prefix match over name/symbol-contains match', () => {
      const returnedAssets = searchAssets('usd', stablecoinAssets)
      expect(returnedAssets.map(a => a.symbol)).toEqual([
        'USDC',
        'USDT',
        'USDS',
        'axlUSDC',
        'yvUSDC',
      ])
    })

    it('matches by name when symbol does not match', () => {
      const returnedAssets = searchAssets('tether', stablecoinAssets)
      expect(returnedAssets[0].symbol).toBe('USDT')
    })

    it('prioritizes exact symbol over symbol-contains', () => {
      const returnedAssets = searchAssets('axlusdc', stablecoinAssets)
      expect(returnedAssets[0].symbol).toBe('axlUSDC')
    })

    it('matches symbol containing search term', () => {
      const returnedAssets = searchAssets('vault', stablecoinAssets)
      expect(returnedAssets[0].symbol).toBe('yvUSDC')
    })
  })

  describe('address search', () => {
    it('matches by contract address', () => {
      const returnedAssets = searchAssets(
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        stablecoinAssets,
      )
      expect(returnedAssets.length).toBe(1)
      expect(returnedAssets[0].symbol).toBe('USDC')
    })
  })

  describe('preserves original order within score tiers', () => {
    it('maintains market cap order for assets with same score', () => {
      const orderedAssets: Asset[] = [
        { ...stablecoinAssets[0], symbol: 'USD1', name: 'USD One' },
        { ...stablecoinAssets[1], symbol: 'USD2', name: 'USD Two' },
        { ...stablecoinAssets[2], symbol: 'USD3', name: 'USD Three' },
      ]
      const returnedAssets = searchAssets('usd', orderedAssets)
      expect(returnedAssets.map(a => a.symbol)).toEqual(['USD1', 'USD2', 'USD3'])
    })
  })
})
