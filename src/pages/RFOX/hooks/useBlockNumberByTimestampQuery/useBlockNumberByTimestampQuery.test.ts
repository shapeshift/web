import type { GetBlockParameters } from 'viem'
import { arbitrum } from 'viem/chains'
import { describe, expect, it, vi } from 'vitest'

import { blocks } from './test-data/blocks'
import { getEarliestBlockNumberByTimestampQueryFn } from './useBlockNumberByTimestampQuery'

const blocksByBlockNumber = blocks.reduce((acc, block) => {
  acc.set(block.number, block)
  return acc
}, new Map())

vi.mock('lib/viem-client', () => {
  const viemArbitrumClient = {
    createEventFilter: vi.fn(() => ({})),
    getBlock: (params?: GetBlockParameters) => {
      return new Promise(resolve => {
        // Get the latest block if no params are provided
        if (!params) {
          return resolve(blocks[0])
        }

        const result = blocksByBlockNumber.get(params.blockNumber)
        if (!result) {
          // if this ever happens, it's a bug in the test
          throw Error(`Block not found: ${params.blockNumber}`)
        }

        resolve(result)
      })
    },
  }

  return {
    viemArbitrumClient,
    viemClientByNetworkId: {
      [arbitrum.id]: viemArbitrumClient,
    },
  }
})

describe('useBlockNumberByTimestampQuery', () => {
  // it('works', async () => {
  //   const targetTimestamp = 1718844641n
  //   const blockNumber = await getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp })()
  //   const client = viemClientByNetworkId[arbitrum.id]
  //   const block = await client.getBlock({ blockNumber })
  //   expect(block.timestamp * 1000n).toBe(targetTimestamp)
  // })

  // it('create test data', async () => {
  //   function replacer(key, value) {
  //     return typeof value === 'bigint' ? value.toString() : value
  //   }

  //   // fetch the last 100 blocks and print them out as json
  //   const client = viemClientByNetworkId[arbitrum.id]
  //   const latestBlock = await client.getBlock()
  //   const blocks = []
  //   for (let i = 0; i < 20; i++) {
  //     const block = await client.getBlock({ blockNumber: latestBlock.number - BigInt(i) })
  //     blocks.push(block)
  //   }
  //   console.log(JSON.stringify(blocks, replacer, 2))
  // })

  it('returns the earliest block number of all blocks matching a unix timestamp', async () => {
    console.log('hi')
    const targetTimestamp = 1718846281n
    const blockNumber = await getEarliestBlockNumberByTimestampQueryFn({
      targetTimestamp,
      averageBlockTimeBlockDistance: blocks.length - 1,
    })()
    const resultBlock = blocksByBlockNumber.get(blockNumber)

    // The timestamp is in seconds but the block time is less than 1 second, so this is only a sanity check
    expect(resultBlock.timestamp).toBe(1718846281n)
    expect(resultBlock.number).toBe(223675821n)
  })

  it('handles blocks prior to `latestBlock - averageBlockTimeBlockDistance`', async () => {
    console.log('hi')
    const targetTimestamp = 1718846281n
    const blockNumber = await getEarliestBlockNumberByTimestampQueryFn({
      targetTimestamp,
      averageBlockTimeBlockDistance: 10,
    })()
    const resultBlock = blocksByBlockNumber.get(blockNumber)

    // The timestamp is in seconds but the block time is less than 1 second, so this is only a sanity check
    expect(resultBlock.timestamp).toBe(1718846281n)
    expect(resultBlock.number).toBe(223675821n)
  })

  // throws when timestamp is in the future
})

// the getEarliestBlockNumberByTimestampQueryFn implementation can only find A block within a second of the timestamp
// this might be good enough?
