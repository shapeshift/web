import { SwapperType } from '../../api'
import { FOX } from '../utils/test-data/assets'
import { CowSwapper, CowSwapperDeps } from './CowSwapper'
import { getUsdRate } from './utils/helpers/helpers'

jest.mock('./utils/helpers/helpers')

const cowSwapperDeps: CowSwapperDeps = {
  apiUrl: 'https://api.cow.fi/mainnet/api/'
}

describe('CowSwapper', () => {
  describe('static properties', () => {
    it('returns the correct swapper name', async () => {
      expect(CowSwapper.swapperName).toEqual('CowSwapper')
    })
  })

  describe('getType', () => {
    it('returns the correct type for CowSwapper', async () => {
      const swapper = new CowSwapper(cowSwapperDeps)
      await expect(swapper.getType()).toEqual(SwapperType.CowSwap)
    })
  })

  describe('getUsdRate', () => {
    it('calls getUsdRate on swapper.getUsdRate', async () => {
      const swapper = new CowSwapper(cowSwapperDeps)
      await swapper.getUsdRate(FOX)
      expect(getUsdRate).toHaveBeenCalledWith(cowSwapperDeps, FOX)
    })
  })
})
