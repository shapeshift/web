import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { Ok } from '@sniptt/monads'
import type Web3 from 'web3'

import { BTC, ETH, FOX, WETH } from '../../utils/test-data/assets'
import { MAX_COWSWAP_TRADE } from '../utils/constants'
import { getCowSwapMinMax } from './getCowSwapMinMax'

const mockOk = Ok as jest.MockedFunction<typeof Ok>
jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => mockOk('0.25'),
}))

const DEPS = {
  apiUrl: '',
  web3: {} as Web3,
  adapter: {} as ethereum.ChainAdapter,
  feeAsset: WETH,
}

describe('getCowSwapMinMax', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', async () => {
    const maybeMinMax = await getCowSwapMinMax(DEPS, FOX, WETH)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for ETH as buy asset', async () => {
    const maybeMinMax = await getCowSwapMinMax(DEPS, FOX, WETH)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('fails on non erc 20 sell assets and non ETH-mainnet buy assets', async () => {
    const expectedError = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getCowSwapMinMax]',
      name: 'SwapError',
    }
    expect((await getCowSwapMinMax(DEPS, ETH, WETH)).unwrapErr()).toMatchObject(expectedError)
    expect((await getCowSwapMinMax(DEPS, FOX, BTC)).unwrapErr()).toMatchObject(expectedError)
  })
})
