import { aapl, ethereum, rune, zero } from 'jest/mocks/assets'
import { mockStore } from 'jest/mocks/store'

import { selectAndSortAssets } from './selectAndSortAssets'

const store = {
  ...mockStore,
  assets: {
    [rune.tokenId]: rune,
    [aapl.tokenId]: aapl,
    [ethereum.chain]: ethereum,
    [zero.tokenId]: zero
  }
}

describe('selectAndSortAssets', () => {
  it('should sort assets', () => {
    const assets = selectAndSortAssets(store)
    expect(assets[0].symbol).toBe('AAPL')
    expect(assets[1].symbol).toBe('ZERO')
    expect(assets[2].symbol).toBe('ETH')
    expect(assets[3].symbol).toBe('RUNE')
  })

  it('should return empty array if there are no assets', () => {
    const assets = selectAndSortAssets(mockStore)
    expect(assets.length).toBe(0)
  })
})
