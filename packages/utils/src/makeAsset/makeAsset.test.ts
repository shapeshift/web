import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ethAssetId, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { MinimalAsset } from './makeAsset'
import { makeAsset } from './makeAsset'

const ETH: Asset = {
  assetId: ethAssetId,
  chainId: ethChainId,
  symbol: 'ETH',
  name: 'Ethereum',
  precision: 18,
  color: '#FFFFFF',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: 'https://etherscan.io/address/',
  relatedAssetKey: null,
}

describe('makeAsset', () => {
  it('can make erc20 shitcoins', () => {
    const assetReference = '0xfoobar0000000000000000000000000000000000'
    const assetNamespace = ASSET_NAMESPACE.erc20
    const symbol = 'FOOO'
    const name = 'Humble Panda'
    const precision = 18
    const chainId = ethChainId
    const assetId: AssetId = toAssetId({ chainId, assetNamespace, assetReference })
    const minimalAsset: MinimalAsset = { assetId, symbol, precision, name }
    const assetsById = { [ETH.assetId]: ETH }
    const asset = makeAsset(assetsById, minimalAsset)
    const asset2 = makeAsset(assetsById, minimalAsset)

    // doesn't molest asset id, precision, symbol, name
    expect(asset?.assetId).toEqual(assetId)
    expect(asset?.name).toEqual(name)
    expect(asset?.symbol).toEqual(symbol)
    expect(asset?.precision).toEqual(precision)

    // belongs to correct chain
    expect(asset?.chainId).toEqual(chainId)

    // inherits fee asset explorer links
    expect(asset?.explorer).toEqual(ETH.explorer)
    expect(asset?.explorerTxLink).toEqual(ETH.explorerTxLink)
    expect(asset?.explorerAddressLink).toEqual(ETH.explorerAddressLink)

    // is deterministic on color and icon
    expect(asset?.color).toEqual(asset2?.color)
    expect(asset?.icon).toEqual(asset2?.icon)
  })
})
