import { AVAX, BSC, BTC, FOX, OPTIMISM, WETH } from '../../utils/test-data/assets'
import { MAX_ZRX_TRADE } from '../utils/constants'
import { getZrxMinMax } from './getZrxMinMax'

jest.mock('../utils/zrxService')
jest.mock('../utils/helpers/helpers')

jest.mock('../utils/helpers/helpers', () => ({
  getUsdRate: () => '1',
  normalizeAmount: () => '1',
}))

describe('getZrxMinMax', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', async () => {
    const minMax = await getZrxMinMax(FOX, WETH)
    expect(minMax.minimumAmountCryptoHuman).toBe('1')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_ZRX_TRADE)
  })

  it('fails on invalid evm asset', async () => {
    await expect(getZrxMinMax(BTC, WETH)).rejects.toThrow('[getZrxMinMax]')
  })

  it('fails on cross-chain swap', async () => {
    await expect(getZrxMinMax(AVAX, WETH)).rejects.toThrow('[getZrxMinMax]')
    await expect(getZrxMinMax(OPTIMISM, WETH)).rejects.toThrow('[getZrxMinMax]')
    await expect(getZrxMinMax(BSC, WETH)).rejects.toThrow('[getZrxMinMax]')
  })
})
