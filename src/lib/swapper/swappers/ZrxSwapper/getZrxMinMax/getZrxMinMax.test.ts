import { AVAX, BSC, BTC, FOX_MAINNET, OPTIMISM, WETH } from '../../utils/test-data/assets'
import { MAX_ZRX_TRADE } from '../utils/constants'
import { getZrxMinMax } from './getZrxMinMax'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

jest.mock('../utils/helpers/helpers', () => ({
  normalizeAmount: () => '1',
}))
jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '1'),
}))

describe('getZrxMinMax', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', async () => {
    const maybeMinMax = await getZrxMinMax(FOX_MAINNET, WETH)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('1')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_ZRX_TRADE)
  })

  it('fails on invalid evm asset', async () => {
    expect((await getZrxMinMax(BTC, WETH)).unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getZrxMinMax]',
      name: 'SwapError',
    })
  })

  it('fails on cross-chain swap', async () => {
    const expected = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getZrxMinMax]',
      name: 'SwapError',
    }
    expect((await getZrxMinMax(AVAX, WETH)).unwrapErr()).toMatchObject(expected)
    expect((await getZrxMinMax(OPTIMISM, WETH)).unwrapErr()).toMatchObject(expected)
    expect((await getZrxMinMax(BSC, WETH)).unwrapErr()).toMatchObject(expected)
  })
})
