import { Ok } from '@sniptt/monads'

import { FOX, WETH } from '../../utils/test-data/assets'
import type { OneInchSwapperDeps } from '../utils/types'
import { getMinMax } from './getMinMax'

const mockOk = Ok as jest.MockedFunction<typeof Ok>
jest.mock('../getUsdRate/getUsdRate', () => ({
  getUsdRate: () => {
    return mockOk('0.0165498')
  },
}))

describe('getMinMax', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }

  it('returns min and max expected values for FOX', async () => {
    const sellAsset = { ...FOX }
    const buyAsset = { ...WETH }
    const maybeMinMax = await getMinMax(deps, sellAsset, buyAsset)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax).toEqual({
      maximumAmountCryptoHuman: '100000000000000000000000000',
      minimumAmountCryptoHuman: '60.42369092073620225018',
    })
  })
})
