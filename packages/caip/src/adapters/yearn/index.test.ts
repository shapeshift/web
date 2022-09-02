import toLower from 'lodash/toLower'

import { toAssetId } from '../../assetId/assetId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import { assetIdToYearn, yearnToAssetId } from '.'

describe('adapters:yearn', () => {
  describe('yearnToAssetId', () => {
    it('can get AssetId id for yvUSDC 0.3.0', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace,
        assetReference: toLower(checksumAddress),
      })
      expect(yearnToAssetId(checksumAddress)).toEqual(assetId)
    })
  })
  describe('AssetIdToYearn', () => {
    it('can get coincap id for yvUSDC 0.3.0', () => {
      const chainNamespace = CHAIN_NAMESPACE.Evm
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace,
        assetReference: toLower(checksumAddress),
      })
      expect(assetIdToYearn(assetId)).toEqual(checksumAddress)
    })
  })
})
