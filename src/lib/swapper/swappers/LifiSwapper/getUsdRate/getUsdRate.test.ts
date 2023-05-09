import type { Token as LifiToken } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import { ChainId as LifiChainId, ChainKey as LifiChainKey } from '@lifi/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'

import { getUsdRate } from './getUsdRate'

describe('getUsdRate', () => {
  const testTokenAddress = '0xa56b1b9f4e5a1a1e0868f5fd4352ce7cdf0c2a4f'

  const testAssetId: AssetId = `${KnownChainIds.AvalancheMainnet}/${ASSET_NAMESPACE.erc20}:${testTokenAddress}`

  const testLifiToken: LifiToken = {
    address: testTokenAddress,
    symbol: 'MATIC',
    decimals: 19,
    chainId: LifiChainId.AVA,
    name: 'Matic',
    priceUSD: '12.34',
  }

  const testAsset: Asset = {
    assetId: testAssetId,
    chainId: KnownChainIds.AvalancheMainnet,
    symbol: 'MATIC',
    name: 'Matic',
    precision: 19,
  } as Asset

  const lifiChainMap = new Map<ChainId, LifiChainKey>([[testAsset.chainId, LifiChainKey.AVA]])

  const mockLifi = {
    getToken: () => Promise.resolve(testLifiToken),
  } as unknown as LIFI

  test('returns USD rate when asset is supported', async () => {
    const maybeResult = await getUsdRate(testAsset, lifiChainMap, mockLifi)

    const expectedUSDValue = testLifiToken.priceUSD
    expect(maybeResult.isErr()).toBe(false)
    expect(maybeResult.unwrap()).toBe(expectedUSDValue)
  })

  test('returns 0 when chain key is not found', async () => {
    const emptyChainMap = new Map<ChainId, LifiChainKey>()

    const maybeResult = await getUsdRate(testAsset, emptyChainMap, mockLifi)

    const expectedUSDValue = '0'
    expect(maybeResult.isErr()).toBe(false)
    expect(maybeResult.unwrap()).toBe(expectedUSDValue)
  })

  test('throws SwapError when LifiError is thrown by getToken', async () => {
    const testLifiError = new Error('Test LIFI error')
    const mockLifiWithError = {
      getToken: () => Promise.reject(testLifiError),
    } as unknown as LIFI

    const maybeUsdRate = await getUsdRate(testAsset, lifiChainMap, mockLifiWithError)
    expect(maybeUsdRate.unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'USD_RATE_FAILED',
      details: undefined,
      message: '[getUsdRate] Test LIFI error',
      name: 'SwapError',
    })
  })

  test('returns 0 when priceUSD is missing', async () => {
    const testLifiTokenMissingPriceUSD = { ...testLifiToken, priceUSD: undefined }
    const mockLifi = {
      getToken: () => Promise.resolve(testLifiTokenMissingPriceUSD),
    } as unknown as LIFI

    const result = await getUsdRate(testAsset, lifiChainMap, mockLifi)

    const expectedUSDValue = '0'
    expect(result.isErr()).toBe(false)
    expect(result.unwrap()).toBe(expectedUSDValue)
  })
})
