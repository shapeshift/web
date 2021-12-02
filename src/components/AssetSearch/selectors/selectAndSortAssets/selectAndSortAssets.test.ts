import { aapl, ethereum, rune, zero } from 'jest/mocks/assets'
import { mockStore } from 'jest/mocks/store'
import { ReduxState } from 'state/reducer'

import { selectAndSortAssets } from './selectAndSortAssets'

const store: ReduxState = {
  ...mockStore,
  assets: {
    byId: {
      [rune.tokenId as string]: rune,
      [aapl.tokenId as string]: aapl,
      [ethereum.chain as string]: ethereum,
      [zero.tokenId as string]: zero
    },
    ids: []
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
