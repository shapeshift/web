import { thorchain } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { ETH } from '../../swappers/utils/test-data'
import type { SwapperConfig } from '../../types'
import { SwapperName } from '../../types'
import { thorService } from '../service'
import type { MidgardPoolResponse } from '../types'
import {
  getExpectedAffiliateFeeSellAssetThorBaseUnit,
  getOutboundFeeSellAssetThorBaseUnit,
  getThresholdedAffiliateBps,
} from './getThresholdedAffiliateBps'

const mockedThorService = vi.mocked(thorService)

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../service', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    thorService: mockAxios.default.create(),
  }
})

describe('getOutboundFeeSellAssetThorBaseUnit', () => {
  it('should return 0.02 rune denominated in the target asset, in thor units', () => {
    const assetPricePrecision = '4.00000' // 1 token is 4x as valuable as 1 rune
    expect(
      getOutboundFeeSellAssetThorBaseUnit(
        assetPricePrecision,
        ETH.assetId,
        SwapperName.Thorchain,
      ).toNumber(),
    ).toEqual(
      Number(thorchain.NATIVE_FEE) / 4, // .005 of the sell asset in THOR base unit
    )
  })

  it('should scale CACAO 10-dec native fee down to non-CACAO 8-dec sell asset precision on MAYA', () => {
    // 1 eth = 100 cacao, NATIVE_FEE = 2e9 (10-dec CACAO = 0.2 CACAO)
    // 0.2 CACAO / 100 (CACAO/ETH) = 0.002 ETH = 200_000 at 8-dec ETH
    const assetPrice = '100'
    expect(
      getOutboundFeeSellAssetThorBaseUnit(
        assetPrice,
        ETH.assetId,
        SwapperName.Mayachain,
      ).toNumber(),
    ).toEqual(200_000)
  })
})

describe('getExpectedAffiliateFeeSellAssetThorBaseUnit', () => {
  it('should return the correct affiliate fee in thor base units', () => {
    const sellAmountCryptoBaseUnit = '1000000000000000000' // 1 eth
    const affiliateBps = '35'
    const sellAsset = ETH

    const result = getExpectedAffiliateFeeSellAssetThorBaseUnit(
      sellAmountCryptoBaseUnit,
      sellAsset,
      affiliateBps,
      SwapperName.Thorchain,
    )

    const expectation = bn('100000000').times('0.0035').toFixed(0)

    expect(result.toFixed(0)).toEqual(expectation)
  })

  it('returns 0 when affiliateBps is 0', () => {
    const sellAmountCryptoBaseUnit = '1000000000000000000' // 1 eth
    const affiliateBps = '0'
    const sellAsset = ETH

    const result = getExpectedAffiliateFeeSellAssetThorBaseUnit(
      sellAmountCryptoBaseUnit,
      sellAsset,
      affiliateBps,
      SwapperName.Thorchain,
    )

    const expectation = '0'

    expect(result.toFixed(0)).toEqual(expectation)
  })
})

describe('getThresholdedAffiliateBps', () => {
  mockedThorService.get.mockImplementation(() => {
    return Promise.resolve(
      Ok({
        data: {
          assetPrice: '100', // 1 eth = 100 rune
        },
      } as unknown as AxiosResponse<MidgardPoolResponse>),
    )
  })

  // outbound fee threshold is 0.02 rune.
  // assuming eth price at 100 rune:
  // 0.02 rune = 0.02 / 100 = 0.0002 eth

  // give an affiliate bps of 50 (0.5%):
  // min input amount = threshold eth / affiliate percentage = 0.0002 eth / 0.5% = 0.04 eth

  it('should return 0 when the sell amount is less than or equal to the rune outbound fee', async () => {
    const sellAmountCryptoBaseUnit = '40000000000000000' // 0.04 eth
    const affiliateBps = '50' // 0.5%
    const sellAsset = ETH

    const result = await getThresholdedAffiliateBps({
      sellAsset,
      affiliateBps,
      sellAmountCryptoBaseUnit,
      config: {} as unknown as SwapperConfig,
      swapperName: SwapperName.Thorchain,
    })

    const expectation = '0'

    expect(result).toEqual(expectation)
  })

  it('should return input affiliate bps when the sell amount is greater than the rune outbound fee', async () => {
    const sellAmountCryptoBaseUnit = '40000000000000001' // > 0.04 eth
    const affiliateBps = '50' // 0.5%
    const sellAsset = ETH

    const result = await getThresholdedAffiliateBps({
      sellAsset,
      affiliateBps,
      sellAmountCryptoBaseUnit,
      config: {} as unknown as SwapperConfig,
      swapperName: SwapperName.Thorchain,
    })

    const expectation = affiliateBps

    expect(result).toEqual(expectation)
  })
})
