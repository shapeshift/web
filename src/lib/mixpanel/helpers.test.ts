import { ethAssetId } from '@shapeshiftoss/caip'
import { describe, expect, it, vi } from 'vitest'

import { mapMixpanelPathname } from './helpers'

import { ethereum } from '@/test/mocks/assets'
import { mockChainAdapters } from '@/test/mocks/portfolio'

vi.mock('@/context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('mixpanel helpers', () => {
  const assets = {
    [ethAssetId]: ethereum,
  }
  describe('mapMixpanelPathname', () => {
    it('can handle base accounts path', () => {
      const pathname = '/wallet/accounts'
      expect(mapMixpanelPathname(pathname, assets)).toEqual('/wallet/accounts')
    })

    it('should flag path with account id', () => {
      const pathname = '/wallet/accounts/eip155:1:0xa4..35/eip155:1%2Fslip44:60'
      expect(mapMixpanelPathname(pathname, assets)).toEqual(null)
    })

    it('should flag path with account id and asset id', () => {
      const pathname = '/wallet/accounts/eip155:1:0xa4..35'
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
  })
})
