import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '0.0165498'),
}))

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman()
    expect(minimumCryptoHuman).toEqual('60.42369092073620225018')
  })
})
