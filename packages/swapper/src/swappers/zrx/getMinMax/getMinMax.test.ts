jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

import { MAX_ZRX_TRADE } from '../utils/constants'
import { BTC, FOX, WETH } from '../utils/test-data/assets'
import { zrxService as mockZrxService } from '../utils/zrxService'
import { getMinMax } from './getMinMax'
;(<jest.Mock<unknown>>mockZrxService.get).mockImplementation(() => ({
  data: { price: '100' }
}))
jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => '1',
  normalizeAmount: () => '1'
}))

describe('getMinMax', () => {
  it('returns minimum, maximum, and minimumPrice', async () => {
    const minMax = await getMinMax({ sellAsset: FOX, buyAsset: WETH })
    expect(minMax.minimum).toBe('1')
    expect(minMax.maximum).toBe(MAX_ZRX_TRADE)
    expect(minMax.minimumPrice).toBe('100')
  })
  it('fails on non eth asset', async () => {
    await expect(getMinMax({ sellAsset: BTC, buyAsset: WETH })).rejects.toThrow(
      'ZrxError:getMinMax - must be eth assets'
    )
  })
})
