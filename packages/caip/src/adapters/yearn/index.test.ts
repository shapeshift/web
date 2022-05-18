import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import toLower from 'lodash/toLower'

import { toAssetId } from '../../assetId/assetId'
import { assetIdToYearn, yearnToAssetId } from '.'

describe('adapters:yearn', () => {
  describe('yearnToAssetId', () => {
    it('can get AssetId id for yvUSDC 0.3.0', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = 'erc20'
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace,
        assetReference: toLower(checksumAddress)
      })
      expect(yearnToAssetId(checksumAddress)).toEqual(assetId)
    })
  })
  describe('AssetIdToYearn', () => {
    it('can get coincap id for yvUSDC 0.3.0', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = 'erc20'
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace,
        assetReference: toLower(checksumAddress)
      })
      expect(assetIdToYearn(assetId)).toEqual(checksumAddress)
    })
  })
})
