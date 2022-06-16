// import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import * as ta from 'type-assertions'

import {
  // PluginChainAdapter,
  PluginChainId,
  RegistrablePlugin,
  RegistrablePluginPluginType,
} from '../types'

type ThisRegistrablePlugin = typeof import('.')
type ThisPlugin = RegistrablePluginPluginType<ThisRegistrablePlugin>

describe('cosmos plugin', () => {
  it('has the correct types', async () => {
    ta.assert<ta.Extends<ThisRegistrablePlugin, RegistrablePlugin>>()
    ta.assert<ta.Equal<PluginChainId<ThisPlugin>, KnownChainIds.CosmosMainnet>>()
    //TODO: Uncomment when concrete type is returned from plugin
    // ta.assert<ta.Equal<PluginChainAdapter<ThisPlugin>, cosmossdk.cosmos.ChainAdapter>>()

    // ta.assert() is checked at compile time, not runtime. This do-nothing expect() is included simply to pacify jest.
    expect(() => ta.assert<true>()).not.toThrow()
  })
})
