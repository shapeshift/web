import type { AssetId } from '@shapeshiftoss/caip'
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { decodeRelatedAssetIndex } from './decodeRelatedAssetIndex'
import { encodeRelatedAssetIndex } from './encodeRelatedAssetIndex'

// Order of these is deliberately shuffled to test sorting is preserved
const mockSortedAssetIds = [
  'eip155:1/erc20:0xeeecd285f60e802ecb6d8d8d37790c887f9a4b33', // big tom
  'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f', // forgotten playland
  'eip155:1/erc20:0xeed3ae7b0f8b5b9bb8c035a9941382b1822671cd', // everycoin
  'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c', // Inception Restaked ETH on Ethereum
  'eip155:1/erc20:0xeee0fe52299f2de8e2ed5111cd521ab67dcf0faf', // the qwan
  'eip155:1/erc20:0xeeda34a377dd0ca676b9511ee1324974fa8d980d', // Curve PUFETH/WSTETH Pool
  'bip122:000000000019d6689c085ae165831e93/slip44:0', // BTC
]

const mockRelatedAssetIndex = {
  'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f': [
    'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f',
    'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c',
  ],
  'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c': [
    'eip155:1/erc20:0xeeee2a2e650697d2a8e8bc990c2f3d04203be06f',
    'eip155:1/erc20:0xf073bac22dab7faf4a3dd6c6189a70d54110525c',
  ],
}

describe('relatedAssetIndex', () => {
  it('can encode and decode related asset index as a complete round trip', () => {
    const encodedRelatedAssetIndex = encodeRelatedAssetIndex(
      mockRelatedAssetIndex,
      mockSortedAssetIds,
    )
    const decodedRelatedAssetIndex = decodeRelatedAssetIndex(
      encodedRelatedAssetIndex,
      mockSortedAssetIds,
    )
    expect(decodedRelatedAssetIndex).toEqual(mockRelatedAssetIndex)
  })

  // Used to check correctness of encode/decode before we migrated to storing encoded asset data
  it.skip('reconciles against full dataset', () => {
    const relatedAssetIndexPath = path.join(
      __dirname,
      '../../../../src/lib/asset-service/service/relatedAssetIndex.json',
    )
    const generatedAssetsPath = path.join(
      __dirname,
      '../../../../src/lib/asset-service/service/generatedAssetData.json',
    )

    const relatedAssetIndex = JSON.parse(fs.readFileSync(relatedAssetIndexPath, 'utf8'))
    const generatedAssetData = JSON.parse(fs.readFileSync(generatedAssetsPath, 'utf8'))
    // Mock sorting of asset IDs
    const sortedAssetIds = Object.keys(generatedAssetData).sort()
    const encodedRelatedAssetIndex = encodeRelatedAssetIndex(relatedAssetIndex, sortedAssetIds)

    console.time('decodeRelatedAssetIndex')
    const decodedRelatedAssetIndex = decodeRelatedAssetIndex(
      encodedRelatedAssetIndex,
      sortedAssetIds,
    )
    console.timeEnd('decodeRelatedAssetIndex')

    for (const [assetId, relatedAssetIds] of Object.entries(relatedAssetIndex)) {
      // Skip empty entries, because we no longer encode them
      if ((relatedAssetIds as AssetId[]).length === 0) continue

      // Skip missing assets, because this is a bug in the original implementation
      if (!generatedAssetData[assetId]) continue

      expect(decodedRelatedAssetIndex[assetId]).toEqual(relatedAssetIds)
    }
  })
})
