import { btcAssetId, ethAssetId, thorchainAssetId } from '@shapeshiftoss/caip'

import { bn } from '../../utils/bignumber'
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

const mockedAxios = jest.mocked(thorService, true)

describe('getSlippage', () => {
  const expectedBtcRuneSlippage = bn('0.00109735998697522801')
  const expectedRuneEthSlippage = bn('0.00165514439633167301')

  beforeEach(() => {
    mockedAxios.get.mockImplementation((url) => {
      switch (url) {
        case '/lcd/thorchain/pools':
          return Promise.resolve({ data: thornodePools })
        case '/lcd/thorchain/inbound_addresses':
          return Promise.resolve({ data: mockInboundAddresses })
        default:
          return Promise.resolve({ data: undefined })
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
      expect(slippage.toPrecision()).toEqual(
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
      expect(slippage.toPrecision()).toEqual('1.6161699588038e-7')
    })

    it('should return slippage for ETH -> RUNE single swap', async () => {
      const slippage = await getSlippage({
        inputAmountThorPrecision: bn(100000000), // 1 ETH
        daemonUrl: '',
        buyAssetId: thorchainAssetId,
        sellAssetId: ethAssetId,
      })
      expect(slippage.toPrecision()).toEqual('0.00010927540718746784')
    })
  })
})
