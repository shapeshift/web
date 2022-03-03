import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetNamespace, AssetReference } from '../../caip19/caip19'
import { toCAIP19 } from './../../caip19/caip19'
import { CAIP19ToOsmosis, osmosisToCAIP19 } from '.'

describe('osmosis adapter', () => {
  describe('osmosisToCAIP19', () => {
    it('can get CAIP19 for non-native asset (Secret Network)', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.IBC
      const assetReference = '0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(osmosisToCAIP19('SCRT')).toEqual(caip19)
    })

    it('can get CAIP19 id for secondary native asset (ion)', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.NATIVE
      const assetReference = 'uion'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(osmosisToCAIP19('ION')).toEqual(caip19)
    })

    it('can get CAIP19 id for native asset (osmo)', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.Slip44
      const assetReference = AssetReference.Osmosis.toString()
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(osmosisToCAIP19('OSMO')).toEqual(caip19)
    })
  })

  describe('CAIP19toOsmosis', () => {
    it('can get osmosis id for non-native osmosis CAIP19', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.IBC
      const assetReference = '0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(CAIP19ToOsmosis(caip19)).toEqual('SCRT')
    })

    it('can get osmosis id for secondary native osmosis CAIP19 (ion)', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.NATIVE
      const assetReference = 'uion'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(CAIP19ToOsmosis(caip19)).toEqual('ION')
    })

    it('can get osmosis id for native osmosis CAIP19 (osmo)', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.Slip44
      const assetReference = AssetReference.Osmosis.toString()
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(CAIP19ToOsmosis(caip19)).toEqual('OSMO')
    })
  })
})
