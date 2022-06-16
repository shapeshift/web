import type { KnownChainIds } from '@shapeshiftoss/types'
import * as ta from 'type-assertions'

import type { ActivePlugin, PluginChainId } from './types'

describe('the set of active plugins', () => {
  it('provides all required types of ChainAdapte', async () => {
    ta.assert<
      ta.Extends<
        | KnownChainIds.BitcoinMainnet
        | KnownChainIds.CosmosMainnet
        | KnownChainIds.EthereumMainnet
        | KnownChainIds.OsmosisMainnet,
        PluginChainId<ActivePlugin>
      >
    >()

    // ta.assert() is checked at compile time, not runtime. This do-nothing expect() is included simply to pacify jest.
    expect(() => ta.assert<true>()).not.toThrow()
  })
})
