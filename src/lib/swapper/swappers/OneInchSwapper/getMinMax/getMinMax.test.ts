import { FOX, WETH } from '../../utils/test-data/assets'
import { getMinMax } from './getMinMax'

jest.mock('state/zustand/swapperStore/selectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/selectors'),
  selectSellAssetFiatRate: jest.fn(() => '0.0165498'),
}))

describe('getMinMax', () => {
  it('returns min and max expected values for FOX', async () => {
    const sellAsset = { ...FOX }
    const buyAsset = { ...WETH }
    const maybeMinMax = await getMinMax(sellAsset, buyAsset)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax).toEqual({
      maximumAmountCryptoHuman: '100000000000000000000000000',
      minimumAmountCryptoHuman: '60.42369092073620225018',
    })
  })
})
