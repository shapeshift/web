import { ethereum } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, WETH } from '../../utils/test-data/assets'
import { MAX_COWSWAP_TRADE } from '../utils/constants'
import { getCowSwapMinMax } from './getCowSwapMinMax'

jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => '0.25',
}))

const DEPS = {
  apiUrl: '',
  web3: {} as Web3,
  adapter: {} as ethereum.ChainAdapter,
  feeAsset: WETH,
}

describe('getCowSwapMinMax', () => {
  it('returns minimum and maximum', async () => {
    const minMax = await getCowSwapMinMax(DEPS, FOX, WETH)
    expect(minMax.minimum).toBe('80')
    expect(minMax.maximum).toBe(MAX_COWSWAP_TRADE)
  })

  it('returns minimum and maximum for ETH as buy asset', async () => {
    const minMax = await getCowSwapMinMax(DEPS, FOX, ETH)
    expect(minMax.minimum).toBe('80')
    expect(minMax.maximum).toBe(MAX_COWSWAP_TRADE)
  })

  it('fails on non erc 20 sell assets and non ETH-mainnet buy assets', async () => {
    await expect(getCowSwapMinMax(DEPS, ETH, WETH)).rejects.toThrow('[getCowSwapMinMax]')
    await expect(getCowSwapMinMax(DEPS, FOX, BTC)).rejects.toThrow('[getCowSwapMinMax]')
  })
})
