jest.mock('../thorService')
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, UNSUPPORTED } from '../../../utils/test-data/assets'
import { ThorchainSwapperDeps } from '../../types'
import { btcMidgardPool, ethMidgardPool, foxMidgardPool } from '../test-data/midgardResponse'
import { thorService } from '../thorService'
import { getTradeRate } from './getTradeRate'

describe('getTradeRate', () => {
  const deps: ThorchainSwapperDeps = {
    midgardUrl: 'localhost:3000',
    adapterManager: <ChainAdapterManager>{},
    web3: <Web3>{},
  }

  it('should calculate a correct rate for trading fox to eth', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }),
    )

    // 1 eth
    const rate = await getTradeRate(ETH, FOX.assetId, '1000000000000000000', deps)
    const expectedRate = '12554.215976'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading eth to fox', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }),
    )

    // 1 fox
    const rate = await getTradeRate(FOX, ETH.assetId, '1000000000000000000', deps)
    const expectedRate = '0.000078'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading fox to btc', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, btcMidgardPool] }),
    )

    // 1 fox
    const rate = await getTradeRate(FOX, BTC.assetId, '1000000000000000000', deps)
    const expectedRate = '0.000005'
    expect(rate).toEqual(expectedRate)
  })

  it('should calculate a correct rate for trading btc to fox', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, btcMidgardPool] }),
    )

    // 0.01 btc
    const rate = await getTradeRate(BTC, FOX.assetId, '1000000', deps)
    const expectedRate = '193385.0366'
    expect(rate).toEqual(expectedRate)
  })

  it('should throw if trying to calculate a rate for an unsupported asset', async () => {
    ;(thorService.get as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve({ data: [foxMidgardPool, ethMidgardPool] }),
    )

    await expect(
      getTradeRate(UNSUPPORTED, ETH.assetId, '1000000000000000000', deps),
    ).rejects.toThrow(`[getTradeRate]: No sellPoolId for asset ${UNSUPPORTED.assetId}`)
  })
})
