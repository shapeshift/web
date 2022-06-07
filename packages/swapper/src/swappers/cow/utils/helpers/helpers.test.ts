import { ETH, FOX, WBTC } from '../../../utils/test-data/assets'
import { CowSwapperDeps } from '../../CowSwapper'
import { cowService } from '../cowService'
import { getUsdRate } from '../helpers/helpers'

jest.mock('../cowService')

describe('utils', () => {
  const cowSwapperDeps: CowSwapperDeps = {
    apiUrl: 'https://api.cow.fi/mainnet/api/'
  }

  describe('getUsdRate', () => {
    it('gets the usd rate of FOX', async () => {
      ;(cowService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            amount: '7702130994619175777719',
            token: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
          }
        })
      )
      const rate = await getUsdRate(cowSwapperDeps, FOX)
      expect(parseFloat(rate)).toBeCloseTo(0.129834198, 9)
      expect(cowService.get).toHaveBeenCalledWith(
        'https://api.cow.fi/mainnet/api//v1/markets/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0xc770eefad204b5180df6a14ee197d99d808ee52d/buy/1000000000'
      )
    })

    it('gets the usd rate of WBTC', async () => {
      ;(cowService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            amount: '3334763',
            token: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
          }
        })
      )
      const rate = await getUsdRate(cowSwapperDeps, WBTC)
      expect(parseFloat(rate)).toBeCloseTo(29987.13851629, 9)
      expect(cowService.get).toHaveBeenCalledWith(
        'https://api.cow.fi/mainnet/api//v1/markets/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599/buy/1000000000'
      )
    })

    it('should fail when called with non-erc20 asset', async () => {
      await expect(getUsdRate(cowSwapperDeps, ETH)).rejects.toThrow(
        '[getUsdRate] - unsupported asset namespace'
      )
    })

    it('should fail when api is returning 0 as token amount', async () => {
      ;(cowService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            amount: '0',
            token: '0xc770eefad204b5180df6a14ee197d99d808ee52d'
          }
        })
      )
      await expect(getUsdRate(cowSwapperDeps, FOX)).rejects.toThrow(
        '[getUsdRate] - Failed to get token amount'
      )
    })

    it('should fail when axios is throwing an error', async () => {
      ;(cowService.get as jest.Mock<unknown>).mockImplementation(() => {
        throw new Error('unexpected error')
      })
      await expect(getUsdRate(cowSwapperDeps, FOX)).rejects.toThrow('[getUsdRate]')
    })
  })
})
