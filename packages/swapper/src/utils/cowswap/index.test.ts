import { describe, expect, it } from 'vitest'

import { getFullAppData } from '.'

describe('getFullAppData', () => {
  it('should return correct AppData for given inputs for no affiliate fee', async () => {
    const slippageTolerancePercentage = '0.005' // 0.5%
    const affiliateAppDataFragment = {} // no affiliate fee

    const result = await getFullAppData(
      slippageTolerancePercentage,
      affiliateAppDataFragment,
      'market',
    )

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

    expect(result).toEqual({
      appDataHash: '0x6a731164dc2bb01874c1537079a3f543894da3b5803dcfed23aaf8396c919be2',
      appData:
        '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"partnerFee":{"bps":48,"recipient":"0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
    })
  })
})
