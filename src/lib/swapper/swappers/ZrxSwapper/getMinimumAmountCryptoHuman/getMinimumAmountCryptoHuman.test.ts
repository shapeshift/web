import { AVAX, BSC, BTC, FOX_MAINNET, OPTIMISM, WETH } from '../../utils/test-data/assets'
import { getMinimumAmountCryptoHuman } from './getMinimumAmountCryptoHuman'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

jest.mock('../utils/helpers/helpers', () => ({
  normalizeAmount: () => '1',
}))
jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '1'),
}))

describe('getMinimumAmountCryptoHuman', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', () => {
    const maybeMin = getMinimumAmountCryptoHuman(FOX_MAINNET, WETH)
    expect(maybeMin.isErr()).toBe(false)
    const min = maybeMin.unwrap()
    expect(min).toBe('1')
  })

  it('fails on invalid evm asset', () => {
    expect(getMinimumAmountCryptoHuman(BTC, WETH).unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getMinimumAmountCryptoHuman]',
      name: 'SwapError',
    })
  })

  it('fails on cross-chain swap', () => {
    const expected = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getMinimumAmountCryptoHuman]',
      name: 'SwapError',
    }
    expect(getMinimumAmountCryptoHuman(AVAX, WETH).unwrapErr()).toMatchObject(expected)
    expect(getMinimumAmountCryptoHuman(OPTIMISM, WETH).unwrapErr()).toMatchObject(expected)
    expect(getMinimumAmountCryptoHuman(BSC, WETH).unwrapErr()).toMatchObject(expected)
  })
})
