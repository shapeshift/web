import { getMinimumCryptoHuman } from './getMinimumCryptoHuman'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

describe('getMinimumCryptoHuman', () => {
  it('returns minimum for ethereum network', () => {
    const sellAssetUsdRate = '1'
    const minimumCryptoHuman = getMinimumCryptoHuman(sellAssetUsdRate)
    expect(minimumCryptoHuman).toBe('1')
  })
})
