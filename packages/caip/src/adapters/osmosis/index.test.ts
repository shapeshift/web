import { toAssetId } from '../../assetId/assetId'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import { assetIdToOsmosis, osmosisToAssetId } from '.'

describe('osmosis adapter', () => {
  const chainNamespace = CHAIN_NAMESPACE.CosmosSdk
  const chainReference = CHAIN_REFERENCE.OsmosisMainnet

  describe('osmosisToAssetId', () => {
    it('can get AssetId for non-native asset (Secret Network)', () => {
      const assetNamespace = 'ibc'
      const assetReference = '0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(osmosisToAssetId('SCRT')).toEqual(assetId)
    })

    it('can get AssetId id for secondary native asset (ion)', () => {
      const assetNamespace = 'native'
      const assetReference = 'uion'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(osmosisToAssetId('ION')).toEqual(assetId)
    })

    it('can get AssetId id for native asset (osmo)', () => {
      const assetNamespace = 'slip44'
      const assetReference = ASSET_REFERENCE.Osmosis.toString()
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(osmosisToAssetId('OSMO')).toEqual(assetId)
    })
  })

  describe('AssetIdtoOsmosis', () => {
    it('can get osmosis id for non-native osmosis AssetId', () => {
      const assetNamespace = 'ibc'
      const assetReference = '0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToOsmosis(assetId)).toEqual('SCRT')
    })

    it('can get osmosis id for secondary native osmosis AssetId (ion)', () => {
      const assetNamespace = 'native'
      const assetReference = 'uion'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToOsmosis(assetId)).toEqual('ION')
    })

    it('can get osmosis id for native osmosis AssetId (osmo)', () => {
      const assetNamespace = 'slip44'
      const assetReference = ASSET_REFERENCE.Osmosis.toString()
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToOsmosis(assetId)).toEqual('OSMO')
    })
  })
})
