import { arbitrum } from 'viem/chains'
import { describe, expect, it, vi } from 'vitest'
import { viemClientByNetworkId } from 'lib/viem-client'

import { getBlockNumberByTimestampQueryFn } from './useBlockNumberByTimestampQuery'

describe('useBlockNumberByTimestampQuery', () => {
  it('works', async () => {
    const targetTimestamp = 1718844641n
    const blockNumber = await getBlockNumberByTimestampQueryFn({ targetTimestamp })()
    const client = viemClientByNetworkId[arbitrum.id]
    const block = await client.getBlock({ blockNumber })
    expect(block.timestamp).toBe(targetTimestamp)
  })
})
