import { ethereum } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, WETH } from '../../utils/test-data/assets'
import { MAX_COWSWAP_TRADE } from '../utils/constants'
import { getCowSwapMinMax } from './getCowSwapMinMax'

jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => '0.25'
}))

const DEPS = {
  apiUrl: '',
  web3: <Web3>{},
  adapter: <ethereum.ChainAdapter>{},
  feeAsset: WETH
}

describe('getCowSwapMinMax', () => {
  it('returns minimum and maximum', async () => {
    const minMax = await getCowSwapMinMax(DEPS, FOX, WETH)
    expect(minMax.minimum).toBe('40')
    expect(minMax.maximum).toBe(MAX_COWSWAP_TRADE)
  })

  it('fails on non erc 20 assets', async () => {
    await expect(getCowSwapMinMax(DEPS, BTC, WETH)).rejects.toThrow('[getCowSwapMinMax]')
    await expect(getCowSwapMinMax(DEPS, FOX, ETH)).rejects.toThrow('[getCowSwapMinMax]')
  })
})
