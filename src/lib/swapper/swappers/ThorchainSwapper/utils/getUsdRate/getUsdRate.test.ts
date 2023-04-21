import { foxThornodePool, usdcThornodePool } from '../test-data/responses'
import { thorService } from '../thorService'
import { getUsdRate } from './getUsdRate'

jest.mock('../thorService')

const mockedAxios = thorService as jest.Mocked<typeof thorService>

describe('getUsdRate', () => {
  it('should return USD rate of given Thorchain asset', async () => {
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('lcd/thorchain/pools')) return Promise.resolve({ data: [usdcThornodePool] })
      return Promise.resolve({ data: foxThornodePool })
    })

    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const maybeRate = await getUsdRate('', assetId)
    expect(maybeRate.isErr()).toBe(false)
    expect(maybeRate.unwrap()).toEqual('0.153996052603362160')
  })

  it('should throw if no poolAssetId is found for specified assetId', async () => {
    const assetId = 'eip155:1/erc20:0xcfoo'
    const maybeRate = await getUsdRate('', assetId)
    expect(maybeRate.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'USD_RATE_FAILED',
      details: undefined,
      message: '[getUsdRate]: no pool found for assetId: eip155:1/erc20:0xcfoo',
      name: 'SwapError',
    })
  })

  it('should throw if pool is no longer available', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const pool = { ...foxThornodePool }
    pool.status = 'Paused'
    mockedAxios.get.mockImplementation(() => Promise.resolve({ data: pool }))
    const maybeRate = await getUsdRate('', assetId)
    expect(maybeRate.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'USD_RATE_FAILED',
      details: undefined,
      message: '[getUsdRate]: pool is no longer available',
      name: 'SwapError',
    })
  })

  it('should throw if pool has a 0 balance', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const pool = { ...foxThornodePool }
    pool.balance_asset = '0'
    mockedAxios.get.mockImplementation(() => Promise.resolve({ data: pool }))
    const maybeRate = await getUsdRate('', assetId)
    expect(maybeRate.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'USD_RATE_FAILED',
      details: undefined,
      message: '[getUsdRate]: pool has a zero balance',
      name: 'SwapError',
    })
  })

  it('should throw if there is no avaialable usd pool to calculate price from', async () => {
    const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('lcd/thorchain/pools')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: foxThornodePool })
    })
    const maybeRate = await getUsdRate('', assetId)
    expect(maybeRate.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'USD_RATE_FAILED',
      details: undefined,
      message: '[getUsdRate]: no available usd pools',
      name: 'SwapError',
    })
  })
})
