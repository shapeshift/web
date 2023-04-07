import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

import { SwapperName } from '../../api'
import { OsmosisSwapper } from './OsmosisSwapper'

describe('OsmosisSwapper', () => {
  const swapper = new OsmosisSwapper({
    adapterManager: {} as ChainAdapterManager,
    osmoUrl: 'http://mock-osmo-url',
    cosmosUrl: 'http://mock-cosmos-url',
  })

  describe('name', () => {
    it('returns the correct human readable swapper name', () => {
      expect(swapper.name).toEqual(SwapperName.Osmosis)
    })
  })
})
