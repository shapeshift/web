import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { filterAssetsBySearchTerm } from './filterAssetsBySearchTerm'

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

describe('filterAssetsBySearchTerm', () => {
  it('returns based on symbol', () => {
    const returnedAssets = filterAssetsBySearchTerm('btc', assets)
    expect(returnedAssets[0].symbol).toBe('BTC')
  })

  it('returns based on displayName', () => {
    const returnedAssets = filterAssetsBySearchTerm('Bitcoin', assets)
    expect(returnedAssets[0].name).toBe('Bitcoin')
  })

  it('returns based on assetId', () => {
    const returnedAssets = filterAssetsBySearchTerm(
      fromAssetId(assets[2]?.assetId).assetReference ?? '',
      assets,
    )
    expect(returnedAssets[0].symbol).toBe('AAMMDAI')
  })

  it('returns closest match instead of the first one in the array', () => {
    const returnedAssets = filterAssetsBySearchTerm('DAI', assets)
    expect(returnedAssets[0].symbol).toBe('DAI')
  })
})
