import { avalancheAssetId, foxAssetId } from '@shapeshiftoss/caip'

import { zerionAssetIdToAssetId } from './utils'

describe('zerion utils', () => {
  describe('zerionAssetIdToAssetId', () => {
    it('can map fee assets', () => {
      const result = zerionAssetIdToAssetId('avax-avalanche-asset')
      expect(result).toEqual(avalancheAssetId)
    })

    it('can map ethereum erc20 assets', () => {
      const result = zerionAssetIdToAssetId(
        '0xc770eefad204b5180df6a14ee197d99d808ee52d-ethereum-asset',
      )
      expect(result).toEqual(foxAssetId)
    })
  })
})
