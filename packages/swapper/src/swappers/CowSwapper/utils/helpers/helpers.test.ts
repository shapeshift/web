import type { AxiosStatic } from 'axios'
import type { Awaitable, HookCleanupCallback } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getFullAppData, getNowPlusThirtyMinutesTimestamp } from './helpers'

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

  describe('getFullAppData', () => {
    it('should return correct AppData for given inputs for no affiliate fee', async () => {
      const slippageTolerancePercentage = '0.005' // 0.5%
      const affiliateAppDataFragment = {} // no affiliate fee

      const result = await getFullAppData(
        slippageTolerancePercentage,
        affiliateAppDataFragment,
        'market',
      )

      expect(result).toHaveProperty('appDataHash')
      expect(result).toHaveProperty('appData')
      expect(result).toEqual({
        appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
        appData:
          '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
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

      const result = await getFullAppData(
        slippageTolerancePercentage,
        affiliateAppDataFragment,
        'market',
      )

      expect(result).toHaveProperty('appDataHash')
      expect(result).toHaveProperty('appData')
      expect(result).toEqual({
        appDataHash: '0x6a731164dc2bb01874c1537079a3f543894da3b5803dcfed23aaf8396c919be2',
        appData:
          '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"partnerFee":{"bps":48,"recipient":"0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
      })
    })
  })
})
