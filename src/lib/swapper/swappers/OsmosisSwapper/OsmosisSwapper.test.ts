import { SwapperName } from '../../api'
import { OsmosisSwapper } from './OsmosisSwapper'

jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => ({ get: () => ({}) }),
}))

jest.mock('config', () => {
  return {
    getConfig: () => ({
      REACT_APP_OSMOSIS_NODE_URL: 'http://mock-osmo-url',
      REACT_APP_COSMOS_NODE_URL: 'http://mock-cosmos-url',
    }),
  }
})

describe('OsmosisSwapper', () => {
  const swapper = new OsmosisSwapper()

  describe('name', () => {
    it('returns the correct human readable swapper name', () => {
      expect(swapper.name).toEqual(SwapperName.Osmosis)
    })
  })
})
