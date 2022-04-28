import { BaseAsset } from '@shapeshiftoss/types'

import { BTCMockedAsset, ETHMockedAsset } from '../service/AssetServiceTestData'
import blacklist from './blacklist.json'
import { filterBlacklistedAssets } from './utils'

// We need to use the non-null assertion because we know this mocks contains the token property
jest.mock('./blacklist.json', () => [ETHMockedAsset.tokens![0].assetId, BTCMockedAsset.assetId], {
  virtual: true
})

const assetList = [Object.assign({}, ETHMockedAsset), BTCMockedAsset] as BaseAsset[]

describe('Utils', () => {
  describe('filterBlacklistedAssets', () => {
    it('should filter BTC from the asset list', () => {
      const filteredAssetList = filterBlacklistedAssets(blacklist, assetList)
      expect(filteredAssetList[0]).toHaveProperty('assetId', ETHMockedAsset.assetId)
    })

    it('should filter ERC20 from the asset list', () => {
      const filteredAssetList = filterBlacklistedAssets(blacklist, assetList)
      const ethFiltered = filteredAssetList[0]
      const remainingToken = ETHMockedAsset.tokens![1]

      expect(ethFiltered.tokens![0]).toHaveProperty('assetId', remainingToken.assetId)
    })
  })
})
