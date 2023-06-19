import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

jest.mock('../utils/helpers/helpers', () => ({
  normalizeAmount: () => '1',
}))
jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '1'),
}))

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const minimumCryptoHuman = getMinimumCryptoHuman()
    expect(minimumCryptoHuman).toBe('1')
  })
})
