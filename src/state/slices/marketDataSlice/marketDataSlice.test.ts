import { caip19 } from '@shapeshiftoss/caip'
import { getMarketData } from '@shapeshiftoss/market-service'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import { rune } from 'jest/mocks/assets'
import { store } from 'state/store'

import { fetchMarketData } from './marketDataSlice'

jest.mock('@shapeshiftoss/market-service', () => ({
  getMarketData: jest.fn()
}))

describe('marketDataSlice', () => {
  describe('fetchMarketData', () => {
    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const contractType = ContractTypes.ERC20
    const tokenId = rune.tokenId
    const runeCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
    it('does not update state if marketData does not exist', async () => {
      ;(getMarketData as unknown as jest.Mock<unknown>).mockImplementation(() =>
        Promise.resolve(null)
      )
      expect(store.getState().marketData.marketData.byId[runeCAIP19]).toBeFalsy()
      await store.dispatch(fetchMarketData(runeCAIP19))
      expect(store.getState().marketData.marketData.byId[runeCAIP19]).toBeFalsy()
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
      expect(store.getState().marketData.marketData.byId[runeCAIP19]).toBeFalsy()
      await store.dispatch(fetchMarketData(runeCAIP19))
      expect(store.getState().marketData.marketData.byId[runeCAIP19]).toBeTruthy()
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
      const ethCAIP19 = caip19.toCAIP19({ chain, network })
      expect(store.getState().marketData.marketData.byId[ethCAIP19]).toBeFalsy()
      await store.dispatch(fetchMarketData(ethCAIP19))
      expect(store.getState().marketData.marketData.byId[ethCAIP19]).toBeTruthy()
    })
  })
})
