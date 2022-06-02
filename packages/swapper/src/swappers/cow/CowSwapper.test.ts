import { SwapperType } from '../../api'
import { CowSwapper } from './CowSwapper'

describe('CowSwapper', () => {
  describe('static properties', () => {
    it('returns the correct swapper name', async () => {
      expect(CowSwapper.swapperName).toEqual('CowSwapper')
    })
  })

  describe('getType', () => {
    it('returns the correct type for CowSwapper', async () => {
      const swapper = new CowSwapper()
      await expect(swapper.getType()).toEqual(SwapperType.CowSwap)
    })
  })
})
