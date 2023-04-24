import { btcAssetId, ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { bn } from 'lib/bignumber/bignumber'

import type { InboundAddressResponse, ThornodePoolResponse } from '../ThorchainSwapper'
import { getSwapOutput } from '../utils/getTradeRate/getTradeRate'
import {
  btcThornodePool,
  ethThornodePool,
  mockInboundAddresses,
  thornodePools,
} from '../utils/test-data/responses'
import { thorService } from '../utils/thorService'
import { getDoubleSwapSlippage, getSingleSwapSlippage, getSlippage } from './getSlippage'

jest.mock('../utils/thorService')

const mockedAxios = thorService as jest.Mocked<typeof thorService>

describe('getSlippage', () => {
  const expectedBtcRuneSlippage = bn('0.00109735998697522801')
  const expectedRuneEthSlippage = bn('0.00165514439633167301')

  beforeEach(() => {
    mockedAxios.get.mockImplementation(url => {
      switch (url) {
        case '/lcd/thorchain/pools':
          return Promise.resolve(
            Ok({ data: thornodePools } as unknown as AxiosResponse<ThornodePoolResponse, any>),
          )
        case '/lcd/thorchain/inbound_addresses':
          return Promise.resolve(
            Ok({ data: mockInboundAddresses } as unknown as AxiosResponse<
              InboundAddressResponse,
              any
            >),
          )
        default:
          return Promise.resolve(Ok({ data: undefined } as unknown as AxiosResponse<any, any>))
      }
    })
  })

  describe('getSingleSwapSlippage', () => {
    it('should return slippage for BTC -> RUNE single swap', async () => {
      const slippage = await getSingleSwapSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 BTC
        pool: btcThornodePool,
        toRune: true,
      }).toPrecision()
      expect(slippage).toEqual(expectedBtcRuneSlippage.toPrecision())
    })

    it('should return slippage for RUNE -> ETH single swap', async () => {
      const firstSwapOutput = getSwapOutput(bn(100000000), btcThornodePool, true)
      const slippage = await getSingleSwapSlippage({
        inputAmountThorPrecision: firstSwapOutput,
        pool: ethThornodePool,
        toRune: false,
      }).toPrecision()
      expect(slippage).toEqual(expectedRuneEthSlippage.toPrecision())
    })
  })

  describe('getDoubleSwapSlippage', () => {
    it('should return slippage for BTC -> RUNE -> ETH double swap', async () => {
      const slippage = await getDoubleSwapSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 ETH
        sellPool: btcThornodePool,
        buyPool: ethThornodePool,
      }).toPrecision()
      expect(slippage).toEqual(expectedBtcRuneSlippage.plus(expectedRuneEthSlippage).toPrecision())
    })
  })

  describe('getSlippage', () => {
    it('should return slippage for BTC -> RUNE -> ETH double swap', async () => {
      const slippage = await getSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 ETH
        daemonUrl: '',
        buyAssetId: ethAssetId,
        sellAssetId: btcAssetId,
      })
      expect(slippage.unwrap().toPrecision()).toEqual(
        expectedBtcRuneSlippage.plus(expectedRuneEthSlippage).toPrecision(),
      )
    })

    it('should return slippage for RUNE -> ETH single swap', async () => {
      const slippage = await getSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 RUNE
        daemonUrl: '',
        buyAssetId: ethAssetId,
        sellAssetId: thorchainAssetId,
      })
      expect(slippage.unwrap().toPrecision()).toEqual('1.6161699588038e-7')
    })

    it('should return slippage for ETH -> RUNE single swap', async () => {
      const slippage = await getSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 ETH
        daemonUrl: '',
        buyAssetId: thorchainAssetId,
        sellAssetId: ethAssetId,
      })
      expect(slippage.unwrap().toPrecision()).toEqual('0.00010927540718746784')
    })
  })
})
