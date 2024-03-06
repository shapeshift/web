import type { Block } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEthersProvider } from 'lib/ethersProviderSingleton'

import { findClosestFoxDiscountDelayBlockNumber } from './utils'

vi.unmock('ethers')

const getBlockSpy = vi.spyOn(getEthersProvider(), 'getBlock')

describe('findClosestFoxDiscountDelayBlockNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the latest block number with no delay hours', async () => {
    const latestBlockNumber = 19377703

    // latestBlock
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: latestBlockNumber,
      } as Block),
    )

    // stub out further calls to getBlock
    getBlockSpy.mockImplementation(() => Promise.resolve(null))

    const actual = await findClosestFoxDiscountDelayBlockNumber(0)

    expect(actual).toEqual(latestBlockNumber)
    expect(getBlockSpy.mock.calls.length).toEqual(1)
  })

  it('should return the latest block number with delay hours (first hit)', async () => {
    // latestBlock
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19377703,
        timestamp: 1709747075,
      } as Block),
    )

    // historicalBlock
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376703,
        timestamp: 1709735003,
      } as Block),
    )

    // targetBlock
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376212,
        timestamp: 1709729075,
      } as Block),
    )

    // stub out further calls to getBlock
    getBlockSpy.mockImplementation(() => Promise.resolve(null))

    const actual = await findClosestFoxDiscountDelayBlockNumber(5)

    expect(actual).toEqual(19376212)
    expect(getBlockSpy.mock.calls.length).toEqual(3)
  })

  it('should return the latest block number with delay hours', async () => {
    // latestBlock
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19377703,
        timestamp: 1709747075,
      } as Block),
    )

    // historicalBlock (fake timestamp to modify averageBlockTimeSeconds)
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376703,
        timestamp: 1709734503,
      } as Block),
    )

    // targetBlock 1
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376272,
        timestamp: 1709729807,
      } as Block),
    )

    // targetBlock 2
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376213,
        timestamp: 1709729087,
      } as Block),
    )

    // targetBlock 3
    getBlockSpy.mockImplementationOnce(() =>
      Promise.resolve({
        number: 19376212,
        timestamp: 1709729075,
      } as Block),
    )

    // stub out further calls to getBlock
    getBlockSpy.mockImplementation(() => Promise.resolve(null))

    const actual = await findClosestFoxDiscountDelayBlockNumber(5)

    expect(actual).toEqual(19376212)
    expect(getBlockSpy.mock.calls.length).toEqual(5)
  })
})
