import type { CowSwapOrder } from '@shapeshiftoss/swapper'
import type { AxiosStatic } from 'axios'

import { domain, getNowPlusThirtyMinutesTimestamp, hashOrder } from './helpers'

jest.mock('../cowService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    cowService: axios.create(),
  }
})

describe('utils', () => {
  describe('getNowPlusThirtyMinutesTimestamp', () => {
    const mockDay = '2020-12-31'
    const mockTime = 'T23:59:59.000Z'
    const mockDate = `${mockDay}${mockTime}`
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(mockDate)))
    afterEach(() => {
      jest.restoreAllMocks()
      jest.useRealTimers()
    })

    it('should return the timestamp corresponding to current time + 30 minutes (UTC)', () => {
      const timestamp = getNowPlusThirtyMinutesTimestamp()
      expect(timestamp).toEqual(1609460999)
      expect(new Date(timestamp * 1000).toUTCString()).toEqual('Fri, 01 Jan 2021 00:29:59 GMT')
    })
  })

  describe('hashOrder', () => {
    it('should return the correct order digest', () => {
      const order: CowSwapOrder = {
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
})
