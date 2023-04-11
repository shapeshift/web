import type { Token as LifiToken } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import { ChainId as LifiChainId, ChainKey as LifiChainKey } from '@lifi/types'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getUsdRate } from './getUsdRate'

describe('getUsdRate', () => {
  const testTokenAddress = '0xa56b1b9f4e5a1a1e0868f5fd4352ce7cdf0c2a4f'
  const unsupportedTokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

  const testAssetId: AssetId = `${KnownChainIds.AvalancheMainnet}/${ASSET_NAMESPACE.erc20}:${testTokenAddress}`
  const unsupportedAssetId: AssetId = `${KnownChainIds.EthereumMainnet}/${ASSET_NAMESPACE.erc20}:${unsupportedTokenAddress}`

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

  const unsupportedAsset: Asset = {
    assetId: unsupportedAssetId,
    chainId: KnownChainIds.AvalancheMainnet,
    symbol: 'USDC',
    name: 'USD Coin',
    precision: 6,
  } as Asset

  const lifiAssetMap = new Map<AssetId, LifiToken>([[testAsset.assetId, testLifiToken]])
  const lifiChainMap = new Map<ChainId, LifiChainKey>([[testAsset.chainId, LifiChainKey.AVA]])

  const mockLifi = {
    getToken: () => Promise.resolve(testLifiToken),
  } as unknown as LIFI

  test('returns USD rate when asset is supported', async () => {
    const result = await getUsdRate(testAsset, lifiAssetMap, lifiChainMap, mockLifi)

    const expectedUSDValue = testLifiToken.priceUSD
    expect(result).toBe(expectedUSDValue)
  })

  test('returns 0 when chain key is not found', async () => {
    const emptyChainMap = new Map<ChainId, LifiChainKey>()

    const result = await getUsdRate(testAsset, lifiAssetMap, emptyChainMap, mockLifi)

    const expectedUSDValue = '0'
    expect(result).toBe(expectedUSDValue)
  })

  test('throws SwapError when lifiAsset is not found', async () => {
    const mockLifi = {
      getToken: () => Promise.resolve(undefined),
    } as unknown as LIFI

    const expectedError = new SwapError('[getUsdRate] unsupported asset', {
      code: SwapErrorType.USD_RATE_FAILED,
      details: { asset: unsupportedAsset },
    })

    await expect(
      getUsdRate(unsupportedAsset, lifiAssetMap, lifiChainMap, mockLifi),
    ).rejects.toEqual(expectedError)
  })

  test('throws SwapError when LifiError is thrown by getToken', async () => {
    const testLifiError = new Error('Test LIFI error')
    const mockLifiWithError = {
      getToken: () => Promise.reject(testLifiError),
    } as unknown as LIFI

    const expectedError = new SwapError(`[getUsdRate] ${testLifiError.message}`, {
      code: SwapErrorType.USD_RATE_FAILED,
    })

    await expect(
      getUsdRate(testAsset, lifiAssetMap, lifiChainMap, mockLifiWithError),
    ).rejects.toEqual(expectedError)
  })

  test('returns 0 when priceUSD is missing', async () => {
    const testLifiTokenMissingPriceUSD = { ...testLifiToken, priceUSD: undefined }
    const mockLifi = {
      getToken: () => Promise.resolve(testLifiTokenMissingPriceUSD),
    } as unknown as LIFI

    const result = await getUsdRate(testAsset, lifiAssetMap, lifiChainMap, mockLifi)

    const expectedUSDValue = '0'
    expect(result).toBe(expectedUSDValue)
  })
})
