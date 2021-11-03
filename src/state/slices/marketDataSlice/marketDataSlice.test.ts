import { getMarketData } from '@shapeshiftoss/market-service'
import { ChainTypes } from '@shapeshiftoss/types'
import { ethereum, rune } from 'jest/mocks/assets'
import { store } from 'state/store'

import { fetchMarketData } from './marketDataSlice'

jest.mock('@shapeshiftoss/market-service', () => ({
  getMarketData: jest.fn()
}))

describe('marketDataSlice', () => {
  it('returns empty object for initialState', async () => {
    expect(store.getState().assets).toEqual({})
  })

  describe('fetchMarketData', () => {
    it('does not update state if marketData does not exist', async () => {
      ;(getMarketData as unknown as jest.Mock<unknown>).mockImplementation(() =>
        Promise.resolve(null)
      )
      expect(store.getState().marketData[rune.tokenId as string]).toBeFalsy()
      await store.dispatch(
        fetchMarketData({
          tokenId: rune.tokenId,
          chain: ChainTypes.Ethereum
        })
      )

      expect(store.getState().marketData[rune.tokenId as string]).toBeFalsy()
    })

    it('updates state if marketData exists with tokenId', async () => {
      ;(getMarketData as unknown as jest.Mock<unknown>).mockImplementation(() =>
        Promise.resolve({
          price: 10,
          marketCap: 1000000,
          changePercent24Hr: 0.06478,
          volume: 90000
        })
      )
      expect(store.getState().marketData[rune.tokenId as string]).toBeFalsy()
      await store.dispatch(
        fetchMarketData({
          tokenId: rune.tokenId,
          chain: ChainTypes.Ethereum
        })
      )

      expect(store.getState().marketData[rune.tokenId as string]).toBeTruthy()
    })

    it('updates state if marketData exists without tokenId', async () => {
      ;(getMarketData as unknown as jest.Mock<unknown>).mockImplementation(() =>
        Promise.resolve({
          price: 10,
          marketCap: 1000000,
          changePercent24Hr: 0.06478,
          volume: 90000
        })
      )
      expect(store.getState().marketData[ethereum.chain]).toBeFalsy()
      await store.dispatch(
        fetchMarketData({
          chain: ChainTypes.Ethereum
        })
      )

      expect(store.getState().marketData[ethereum.chain]).toBeTruthy()
    })
  })
})
