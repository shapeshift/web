import { ethAssetId, foxAssetId, optimismAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import { DAO_TREASURY_ETHEREUM_MAINNET, DAO_TREASURY_OPTIMISM } from 'constants/treasury'

import { FOX, WETH } from '../../../utils/test-data/assets'
import { zrxServiceFactory } from '../zrxService'
import { getTreasuryAddressForReceiveAsset, getUsdRate } from './helpers'

jest.mock('lib/swapper/swappers/ZrxSwapper/utils/zrxService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    zrxServiceFactory: () => axios.create(),
  }
})

const zrxService = zrxServiceFactory({ baseUrl: 'https://api.0x.org/' })

describe('utils', () => {
  describe('getUsdRate', () => {
    it('getUsdRate gets the usd rate of the symbol', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve(Ok({ data: { price: '2' } })),
      )
      const rate = await getUsdRate(FOX)
      expect(rate.unwrap()).toBe('0.5')
      expect(zrxService.get).toHaveBeenCalledWith('/swap/v1/price', {
        params: {
          buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          buyAmount: '1000000000',
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        },
      })
    })
    it('getUsdRate fails', async () => {
      ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Ok(Promise.resolve({ data: {} })))
      expect((await getUsdRate(WETH)).unwrapErr()).toMatchObject({
        cause: undefined,
        code: 'RESPONSE_ERROR',
        details: undefined,
        message: '[getUsdRate] - Failed to get price data',
        name: 'SwapError',
      })
    })
  })

  describe('getTreasuryAddressForReceiveAsset', () => {
    it('gets the treasury address for an ERC20 asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(foxAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
    })

    it('gets the treasury address for ETH asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(ethAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
    })

    it('gets the treasury address for Optimism asset', () => {
      const treasuryAddress = getTreasuryAddressForReceiveAsset(optimismAssetId)
      expect(treasuryAddress).toStrictEqual(DAO_TREASURY_OPTIMISM)
    })

    it('throws for unsupported chains', () => {
      expect(() => getTreasuryAddressForReceiveAsset(thorchainAssetId)).toThrow(
        '[getTreasuryAddressForReceiveAsset] - Unsupported chainId',
      )
    })
  })
})
