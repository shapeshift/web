import type { AxiosStatic } from 'axios'
import type { Awaitable, HookCleanupCallback } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CowSwapOrder } from '../../../../types'
import { domain, getFullAppData, getNowPlusThirtyMinutesTimestamp, hashOrder } from './helpers'

vi.mock('../cowService', async () => {
  const axios: AxiosStatic = await vi.importMock('axios')
  axios.create = vi.fn(() => axios)

  return {
    cowService: axios.create(),
  }
})

describe('utils', () => {
  describe('getNowPlusThirtyMinutesTimestamp', () => {
    const mockDay = '2020-12-31'
    const mockTime = 'T23:59:59.000Z'
    const mockDate = `${mockDay}${mockTime}`
    beforeEach(
      () =>
        vi
          .useFakeTimers()
          .setSystemTime(new Date(mockDate)) as unknown as Awaitable<HookCleanupCallback>,
    )
    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('should return the timestamp corresponding to current time + 30 minutes (UTC)', () => {
      const timestamp = getNowPlusThirtyMinutesTimestamp()
      expect(timestamp).toEqual(1609460999)
      expect(new Date(timestamp * 1000).toUTCString()).toEqual('Fri, 01 Jan 2021 00:29:59 GMT')
    })
  })

  describe('hashOrder', () => {
    it('should return the correct order digest', () => {
      const order: Omit<CowSwapOrder, 'appDataHash'> = {
        sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        sellAmount: '20200000000000000',
        buyAmount: '272522025311597443544',
        validTo: 1656667297,
        appData: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
        feeAmount: '3514395197690019',
        kind: 'sell',
        partiallyFillable: false,
        receiver: '0xFc81A7B9f715A344A7c4ABFc444A774c3E9BA42D',
        sellTokenBalance: 'erc20',
        buyTokenBalance: 'erc20',
        quoteId: 1,
      }

      const orderDigest = hashOrder(domain(1, '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'), order)
      expect(orderDigest).toEqual(
        '0x36f3ae3a19c9c5898d921ce86c1be9e3ae0c8ec1bdd162e7d2f6e83e6bf9a4e6',
      )
    })
  })
  describe('getFullAppData', () => {
    it('should return correct AppData for given inputs for no affiliate fee', async () => {
      const slippageTolerancePercentage = '0.005' // 0.5%
      const affiliateAppDataFragment = {} // no affiliate fee

      const result = await getFullAppData(slippageTolerancePercentage, affiliateAppDataFragment)

      expect(result).toHaveProperty('appDataHash')
      expect(result).toHaveProperty('appData')
      expect(result).toEqual({
        appDataHash: '0x9b3c15b566e3b432f1ba3533bb0b071553fd03cec359caf3e6559b29fec1e62e',
        appData:
          '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
      })
    })
    it('should return correct AppData for given inputs for affiliate fee', async () => {
      const slippageTolerancePercentage = '0.005' // 0.5%
      const affiliateAppDataFragment = {
        partnerFee: {
          bps: 48,
          recipient: '0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3',
        },
      }

      const result = await getFullAppData(slippageTolerancePercentage, affiliateAppDataFragment)

      expect(result).toHaveProperty('appDataHash')
      expect(result).toHaveProperty('appData')
      expect(result).toEqual({
        appDataHash: '0x415378688feaaa6cfcdb873d9b467c8201b821cfa3a567f058c04871d317da34',
        appData:
          '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"partnerFee":{"bps":48,"recipient":"0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3"},"quote":{"slippageBips":"50"}},"version":"0.9.0"}',
      })
    })
  })
})
