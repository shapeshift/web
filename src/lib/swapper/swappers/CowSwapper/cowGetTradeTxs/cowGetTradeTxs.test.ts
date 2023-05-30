import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import { cowService } from '../utils/cowService'
import { cowGetTradeTxs } from './cowGetTradeTxs'
import { CowTradeResult } from '../types'

jest.mock('../utils/cowService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    cowService: axios.create(),
  }
})

describe('cowGetTradeTxs', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should call cowService with correct parameters and return an empty string if the order is not fulfilled', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      sellAssetChainId: 'eip155:1'
    }

    ;(cowService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(
        Ok({
          data: {
            status: 'open',
          },
        }),
      ),
    )

    const maybeResult = await cowGetTradeTxs(input)

    expect(maybeResult.isErr()).toBe(false)
    const result = maybeResult.unwrap()
    expect(result).toEqual({ sellTxid: '' })
    expect(cowService.get).toHaveBeenCalledWith(
      'https://api.cow.fi/mainnet/api/v1/orders/tradeId1112345',
    )
    expect(cowService.get).toHaveBeenCalledTimes(1)
  })

  it('should call cowService with correct parameters and return the tx hash if the order is fulfilled', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      sellAssetChainId: 'eip155:1'
    }

    ;(cowService.get as jest.Mock<unknown>)
      .mockReturnValueOnce(
        Promise.resolve(
          Ok({
            data: {
              status: 'fulfilled',
            },
          }),
        ),
      )
      .mockReturnValueOnce(
        Promise.resolve(
          Ok({
            data: [{ txHash: '123txHash456' }],
          }),
        ),
      )

    const maybeResult = await cowGetTradeTxs(input)

    expect(maybeResult.isErr()).toBe(false)
    const result = maybeResult.unwrap()
    expect(result).toEqual({ sellTxid: 'tradeId1112345', buyTxid: '123txHash456' })
    expect(cowService.get).toHaveBeenNthCalledWith(
      1,
      'https://api.cow.fi/mainnet/api/v1/orders/tradeId1112345',
    )
    expect(cowService.get).toHaveBeenNthCalledWith(
      2,
      'https://api.cow.fi/mainnet/api/v1/trades/?orderUid=tradeId1112345',
    )
    expect(cowService.get).toHaveBeenCalledTimes(2)
  })
})
