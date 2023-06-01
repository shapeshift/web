import { ethChainId, gnosisChainId } from '@shapeshiftoss/caip'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import type { CowTradeResult } from '../types'
import { cowService } from '../utils/cowService'
import { cowGetTradeTxs } from './cowGetTradeTxs'

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

  it('should call cowService with correct parameters and return an empty string if the order is not fulfilled for Ethereum', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      chainId: ethChainId,
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

  it('should call cowService with correct parameters and return an empty string if the order is not fulfilled for Gnosis', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      chainId: gnosisChainId,
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
      'https://api.cow.fi/xdai/api/v1/orders/tradeId1112345',
    )
    expect(cowService.get).toHaveBeenCalledTimes(1)
  })

  it('should call cowService with correct parameters and return the tx hash if the order is fulfilled for Ethereum', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      chainId: 'eip155:1',
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

  it('should call cowService with correct parameters and return the tx hash if the order is fulfilled for Gnosis', async () => {
    const input: CowTradeResult = {
      tradeId: 'tradeId1112345',
      chainId: 'eip155:100',
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
      'https://api.cow.fi/xdai/api/v1/orders/tradeId1112345',
    )
    expect(cowService.get).toHaveBeenNthCalledWith(
      2,
      'https://api.cow.fi/xdai/api/v1/trades/?orderUid=tradeId1112345',
    )
    expect(cowService.get).toHaveBeenCalledTimes(2)
  })
})
