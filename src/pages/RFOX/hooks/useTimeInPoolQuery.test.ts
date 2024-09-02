import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import dayjs from 'dayjs'
import type { GetBlockReturnType } from 'viem'
import { arbitrum } from 'viem/chains'
import { describe, expect, it, vi } from 'vitest'

import type { RFOXAccountLog } from '../types'
import { getTimeInPoolSeconds } from './useTimeInPoolQuery'

vi.mock('lib/viem-client', () => {
  return {
    viemClientByNetworkId: {
      [arbitrum.id]: {
        getBlock: vi.fn(),
      },
    },
  }
})

describe('getTimeInPoolSeconds', () => {
  it('returns 0n if there are no logs', async () => {
    const logs: RFOXAccountLog[] = []
    const result = await getTimeInPoolSeconds(logs)
    expect(result).toBe(0n)
  })

  it('calculates time correctly when there are only Stake events i.e balance never goes to zero', async () => {
    const logs = [
      {
        eventName: 'Stake',
        args: { amount: 1000000000000000000n },
        blockNumber: 100n,
      },
      {
        eventName: 'Stake',
        args: { amount: 2000000000000000000n },
        blockNumber: 150n,
      },
    ] as RFOXAccountLog[]

    vi.mocked(viemClientByNetworkId[arbitrum.id].getBlock).mockImplementationOnce(() => {
      return { timestamp: 1625097600 } as unknown as Promise<GetBlockReturnType>
    })

    const result = await getTimeInPoolSeconds(logs)
    const now = dayjs().unix()
    expect(result).toBe(BigInt(now) - BigInt(1625097600))
  })

  it('calculates time correctly when Stake, balance goes to zero after Unstake, then Stake again', async () => {
    const logs: RFOXAccountLog[] = [
      {
        eventName: 'Stake',
        args: { amount: 1000000000000000000n },
        blockNumber: 100n,
      },
      {
        eventName: 'Unstake',
        args: { amount: 1000000000000000000n },
        blockNumber: 150n,
      },
      {
        eventName: 'Stake',
        args: { amount: 1000000000000000000n },
        blockNumber: 200n,
      },
    ] as RFOXAccountLog[]

    vi.mocked(viemClientByNetworkId[arbitrum.id].getBlock).mockImplementationOnce(() => {
      return { timestamp: 1625097600 } as unknown as Promise<GetBlockReturnType>
    })

    const result = await getTimeInPoolSeconds(logs)
    const now = dayjs().unix()
    expect(result).toBe(BigInt(now) - BigInt(1625097600))
  })

  it('calculates time correctly when balance reaches zero', async () => {
    const logs: RFOXAccountLog[] = [
      {
        eventName: 'Stake',
        args: { amount: 1000000000000000000n },
        blockNumber: 100n,
      },
      {
        eventName: 'Unstake',
        args: { amount: 1000000000000000000n },
        blockNumber: 150n,
      },
    ] as RFOXAccountLog[]

    vi.mocked(viemClientByNetworkId[arbitrum.id].getBlock).mockImplementationOnce(() => {
      return { timestamp: 1625097600 } as unknown as Promise<GetBlockReturnType>
    })

    const result = await getTimeInPoolSeconds(logs)
    expect(result).toBe(0n)
  })
})
