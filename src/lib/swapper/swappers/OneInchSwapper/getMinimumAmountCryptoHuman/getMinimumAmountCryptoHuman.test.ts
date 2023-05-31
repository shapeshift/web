import { FOX_MAINNET, WETH } from '../../utils/test-data/assets'
import { getMinimumAmountCryptoHuman } from './getMinimumAmountCryptoHuman'

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '0.0165498'),
}))

describe('getMinimumAmountCryptoHuman', () => {
  it('returns min and max expected values for FOX', () => {
    const sellAsset = { ...FOX_MAINNET }
    const buyAsset = { ...WETH }
    const maybeMin = getMinimumAmountCryptoHuman(sellAsset, buyAsset)
    expect(maybeMin.isErr()).toBe(false)
    const min = maybeMin.unwrap()
    expect(min).toEqual('60.42369092073620225018')
  })
})
