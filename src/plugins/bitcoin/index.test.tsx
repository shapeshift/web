// import type { bitcoin } from '@shapeshiftoss/chain-adapters'
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

describe('bitcoin plugin', () => {
  it('has the correct types', async () => {
    ta.assert<ta.Extends<ThisRegistrablePlugin, RegistrablePlugin>>()
    ta.assert<ta.Equal<PluginChainId<ThisPlugin>, KnownChainIds.BitcoinMainnet>>()
    //TODO: Uncomment when concrete type is returned from plugin
    // ta.assert<ta.Equal<PluginChainAdapter<ThisPlugin>, bitcoin.ChainAdapter>>()

    // ta.assert() is checked at compile time, not runtime. This do-nothing expect() is included simply to pacify jest.
    expect(() => ta.assert<true>()).not.toThrow()
  })
})
