import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, ethChainId, toAssetId } from '@shapeshiftoss/caip'
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

    expect(asset.assetId).toEqual(assetId)
    expect(asset.chainId).toEqual(chainId)

    expect(asset.explorer).toBeDefined()
    expect(asset.explorerTxLink).toBeDefined()
    expect(asset.explorerAddressLink).toBeDefined()
  })
})
