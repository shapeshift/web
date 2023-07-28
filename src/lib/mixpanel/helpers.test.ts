import { ethAssetId } from '@shapeshiftoss/caip'
import { ethereum } from 'test/mocks/assets'
import { mockChainAdapters } from 'test/mocks/portfolio'
import type { Asset } from 'lib/asset-service'

import { mapMixpanelPathname } from './helpers'

jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('mixpanel helpers', () => {
  const assets = {
    [ethAssetId]: ethereum,
    // Osmosis OSMO/ATOM LP
    'cosmos:osmosis-1/ibc:gamm/pool/1': {
      assetId: 'cosmos:osmosis-1/ibc:gamm/pool/1',
      chainId: 'cosmos:osmosis-1',
      symbol: 'gamm/pool/1',
    } as Asset,
  }
  describe('mapMixpanelPathname', () => {
    it('can handle base accounts path', () => {
      const pathname = '/dashboard/accounts'
      expect(mapMixpanelPathname(pathname, assets)).toEqual('/dashboard/accounts')
    })

    it('should flag path with account id', () => {
      const pathname = '/dashboard/accounts/eip155:1:0xa4..35/eip155:1%2Fslip44:60'
      expect(mapMixpanelPathname(pathname, assets)).toEqual(null)
    })

    it('should flag path with account id and asset id', () => {
      const pathname = '/dashboard/accounts/eip155:1:0xa4..35'
      expect(mapMixpanelPathname(pathname, assets)).toEqual(null)
    })

    it('can handle base assets path', () => {
      const pathname = '/assets'
      expect(mapMixpanelPathname(pathname, assets)).toEqual('/assets')
    })

    it('can handle assets path', () => {
      const pathname = '/assets/eip155:1/slip44:60'
      expect(mapMixpanelPathname(pathname, assets)).toEqual('/assets/Ethereum.ETH')
    })

    it('can handle assets path with inner forward slashes in the assetReference part', () => {
      const pathname = '/assets/cosmos:osmosis-1/ibc:gamm/pool/1'
      expect(mapMixpanelPathname(pathname, assets)).toEqual('/assets/Osmosis.gamm/pool/1')
    })
  })
})
