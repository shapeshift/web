import axios from 'axios'

import { FOX, WETH } from '../../../../../packages/swapper/src/swappers/utils/test-data/assets'
import type { OneInchSwapperDeps } from '../utils/types'
import { getMinMax, getUsdRate } from './helpers'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>
jest.mock('../getUsdRate/getUsdRate', () => ({
  getUsdRate: () => {
    return '0.0165498'
  },
}))

describe('getMinMax', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const quoteURL = `${deps.apiUrl}/1/quote`

  it('returns min and max expected values for FOX', async () => {
    const sellAsset = { ...FOX }
    const buyAsset = { ...WETH }
    const minMax = await getMinMax(deps, sellAsset, buyAsset)
    expect(minMax).toEqual({
      maximumAmountCryptoHuman: '100000000000000000000000000',
      minimumAmountCryptoHuman: '60.42369092073620225018',
    })
  })
})
