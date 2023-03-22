import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { ethereum } from 'test/mocks/assets'
import { mockChainAdapters } from 'test/mocks/portfolio'

import type { MinimalAsset } from './assetsSlice'
import { makeAsset } from './assetsSlice'

jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

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
    const asset = makeAsset(minimalAsset)
    const asset2 = makeAsset(minimalAsset)

    // doesn't molest asset id, precision, symbol, name
    expect(asset.assetId).toEqual(assetId)
    expect(asset.name).toEqual(name)
    expect(asset.symbol).toEqual(symbol)
    expect(asset.precision).toEqual(precision)

    // belongs to correct chain
    expect(asset.chainId).toEqual(chainId)

    // inherits fee asset explorer links
    expect(asset.explorer).toEqual(ethereum.explorer)
    expect(asset.explorerTxLink).toEqual(ethereum.explorerTxLink)
    expect(asset.explorerAddressLink).toEqual(ethereum.explorerAddressLink)

    // is deterministic on color and icon
    expect(asset.color).toEqual(asset2.color)
    expect(asset.icon).toEqual(asset2.icon)
  })
})
