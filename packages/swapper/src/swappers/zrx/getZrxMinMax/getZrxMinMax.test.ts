jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

import { MAX_ZRX_TRADE } from '../utils/constants'
import { BTC, FOX, WETH } from '../utils/test-data/assets'
import { zrxService as mockZrxService } from '../utils/zrxService'
import { getZrxMinMax } from './getZrxMinMax'
;(<jest.Mock<unknown>>mockZrxService.get).mockImplementation(() => ({
  data: { price: '100' }
}))
jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => '1',
  normalizeAmount: () => '1'
}))

describe('getZrxMinMax', () => {
  it('returns minimum and maximum', async () => {
    const minMax = await getZrxMinMax({ sellAsset: FOX, buyAsset: WETH })
    expect(minMax.minimum).toBe('1')
    expect(minMax.maximum).toBe(MAX_ZRX_TRADE)
  })
  it('fails on non eth asset', async () => {
    await expect(getZrxMinMax({ sellAsset: BTC, buyAsset: WETH })).rejects.toThrow(
      'ZrxError:getZrxMinMax - must be eth assets'
    )
  })
})
