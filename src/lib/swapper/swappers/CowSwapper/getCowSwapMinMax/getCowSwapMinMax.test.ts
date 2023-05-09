import { BTC, ETH, FOX, WETH } from '../../utils/test-data/assets'
import { MAX_COWSWAP_TRADE } from '../utils/constants'
import { getCowSwapMinMax } from './getCowSwapMinMax'

jest.mock('state/zustand/swapperStore/selectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/selectors'),
  selectSellAssetFiatRate: jest.fn(() => '0.25'),
}))

describe('getCowSwapMinMax', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', () => {
    const maybeMinMax = getCowSwapMinMax(FOX, WETH)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for ETH as buy asset', () => {
    const maybeMinMax = getCowSwapMinMax(FOX, WETH)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('fails on non erc 20 sell assets and non ETH-mainnet buy assets', () => {
    const expectedError = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getCowSwapMinMax]',
      name: 'SwapError',
    }
    expect(getCowSwapMinMax(ETH, WETH).unwrapErr()).toMatchObject(expectedError)
    expect(getCowSwapMinMax(FOX, BTC).unwrapErr()).toMatchObject(expectedError)
  })
})
