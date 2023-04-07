import { AxiosStatic } from 'axios'

import { FOX, WETH } from '../../../utils/test-data/assets'
import { zrxServiceFactory } from '../zrxService'
import { getUsdRate } from './helpers'

const axios: AxiosStatic = jest.createMockFromModule('axios')
axios.create = jest.fn(() => axios)

jest.mock('../zrxService', () => ({
  zrxServiceFactory: () => axios.create(),
}))

const zrxService = zrxServiceFactory('https://api.0x.org/')

describe('utils', () => {
  describe('getUsdRate', () => {
    it('getUsdRate gets the usd rate of the symbol', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({ data: { price: '2' } }),
      )
      const rate = await getUsdRate(FOX)
      expect(rate).toBe('0.5')
      expect(zrxService.get).toHaveBeenCalledWith('/swap/v1/price', {
        params: {
          buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          buyAmount: '1000000000',
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        },
      })
    })
    it('getUsdRate fails', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data: {} }))
      await expect(getUsdRate(WETH)).rejects.toThrow('[getUsdRate]')
    })
  })
})
