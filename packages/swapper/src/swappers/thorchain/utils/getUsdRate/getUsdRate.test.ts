import { foxThornodePool, usdcThornodePool } from '../test-data/responses'
import { thorService } from '../thorService'
import { getUsdRate } from './getUsdRate'

jest.mock('../thorService')

const mockedAxios = jest.mocked(thorService, true)

describe('getUsdRate', () => {
  it('should return USD rate of given Thorchain asset', async () => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('lcd/thorchain/pools')) return Promise.resolve({ data: [usdcThornodePool] })
      return Promise.resolve({ data: foxThornodePool })
    })

    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const rate = await getUsdRate('', assetId)
    expect(rate).toEqual('0.153996052603362160')
  })

  it('should throw if no poolAssetId is found for specified assetId', async () => {
    const assetId = 'eip155:1/erc20:0xcfoo'
    await expect(getUsdRate('', assetId)).rejects.toThrow(
      `[getUsdRate]: no pool found for assetId: ${assetId}`,
    )
  })

  it('should throw if pool is no longer available', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const pool = { ...foxThornodePool }
    pool.status = 'Paused'
    mockedAxios.get.mockImplementation(() => Promise.resolve({ data: pool }))
    await expect(getUsdRate('', assetId)).rejects.toThrow(
      `[getUsdRate]: pool is no longer available`,
    )
  })

  it('should throw if pool has a 0 balance', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const pool = { ...foxThornodePool }
    pool.balance_asset = '0'
    mockedAxios.get.mockImplementation(() => Promise.resolve({ data: pool }))
    await expect(getUsdRate('', assetId)).rejects.toThrow(`[getUsdRate]: pool has a zero balance`)
  })

  it('should throw if there is no avaialable usd pool to calculate price from', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('lcd/thorchain/pools')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: foxThornodePool })
    })
    await expect(getUsdRate('', assetId)).rejects.toThrow(`[getUsdRate]: no available usd pools`)
  })
})
