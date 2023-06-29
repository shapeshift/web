import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

jest.mock('../utils/helpers/helpers', () => ({
  normalizeAmount: () => '1',
}))

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const sellAssetUsdRate = '1'
    const minimumCryptoHuman = getMinimumCryptoHuman(sellAssetUsdRate)
    expect(minimumCryptoHuman).toBe('1')
  })
})
