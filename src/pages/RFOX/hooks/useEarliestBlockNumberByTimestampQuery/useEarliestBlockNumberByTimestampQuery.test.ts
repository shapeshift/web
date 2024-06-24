import type { GetBlockParameters } from 'viem'
import { arbitrum } from 'viem/chains'
import { describe, expect, it, vi } from 'vitest'

import { blocks } from './test-data/blocks'
import { getEarliestBlockNumberByTimestampQueryFn } from './useEarliestBlockNumberByTimestampQuery'

const blocksByBlockNumber = blocks.reduce((acc, block) => {
  acc.set(block.number, block)
  return acc
}, new Map())

const mocks = vi.hoisted(() => ({
  getBlock: vi.fn().mockImplementation((params?: GetBlockParameters) => {
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
  }),
}))

vi.mock('lib/viem-client', () => {
  const viemArbitrumClient = {
    getBlock: mocks.getBlock,
  }

  return {
    viemArbitrumClient,
    viemClientByNetworkId: {
      [arbitrum.id]: viemArbitrumClient,
    },
  }
})

describe('useBlockNumberByTimestampQuery', () => {
  it('returns the earliest block number of all blocks matching a given unix timestamp', async () => {
    // Simulate block history with some block within the average block time param, and some outside
    const averageBlockTimeBlockDistance = Math.floor(blocks.length / 2)

    // Slice off the last 5 blocks to avoid algorithm running off the end of the dataset
    const blocksToTest = blocks.slice(0, -5)

    // Naively calculate all of the earliest blocks per unique timestamp
    const earliestBlocksByTimestamp = new Map()
    for (const block of blocksToTest) {
      if (
        !earliestBlocksByTimestamp.has(block.timestamp) ||
        earliestBlocksByTimestamp.get(block.timestamp).number > (block.number ?? 0n)
      ) {
        earliestBlocksByTimestamp.set(block.timestamp, block)
      }
    }

    // Check every unique timestamp in the dataset
    for (const [timestamp, expectedBlock] of earliestBlocksByTimestamp) {
      const blockNumber = await getEarliestBlockNumberByTimestampQueryFn({
        targetTimestamp: timestamp,
        averageBlockTimeBlockDistance,
      })()
      const resultBlock = blocksByBlockNumber.get(blockNumber)

      expect(resultBlock.timestamp).toBe(expectedBlock.timestamp)
      expect(resultBlock.number).toBe(expectedBlock.number)
    }
  })

  it('throws when the target timestamp is in the future', async () => {
    // Set the target timestamp to be 1 second after the latest block
    const targetTimestamp = blocks[0].timestamp + 1n

    const fn = getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp })

    await expect(fn()).rejects.toThrow('Target timestamp must not be in the future')
  })

  it('exits early when hitting block 0', async () => {
    const averageBlockTimeBlockDistance = blocks.length - 1

    const earliestDatasetBlockNumber = blocks[blocks.length - 1].number ?? 0n
    const blocksFromGenesis = blocks.map(block => ({
      ...block,
      number: (block.number ?? 0n) - earliestDatasetBlockNumber,
    }))

    // Ensure the earliest block is block 0
    expect(blocksFromGenesis[blocksFromGenesis.length - 1].number).toBe(0n)

    const blocksByBlockNumber = blocksFromGenesis.reduce((acc, block) => {
      acc.set(block.number, block)
      return acc
    }, new Map())

    // update the mock to use a dataset starting from genesis
    mocks.getBlock.mockImplementation((params?: GetBlockParameters) => {
      return new Promise(resolve => {
        // Get the latest block if no params are provided
        if (!params) {
          return resolve(blocksFromGenesis[0])
        }

        const result = blocksByBlockNumber.get(params.blockNumber)
        if (!result) {
          // if this ever happens, it's a bug in the test
          throw Error(`Block not found: ${params.blockNumber}`)
        }

        resolve(result)
      })
    })

    // Set the target timestamp to be sometime insanely old, like 0
    const targetTimestamp = 0n

    const blockNumber = await getEarliestBlockNumberByTimestampQueryFn({
      targetTimestamp,
      averageBlockTimeBlockDistance,
    })()
    const resultBlock = blocksByBlockNumber.get(blockNumber)
    const genesisBlock = blocksByBlockNumber.get(0n)

    expect(resultBlock.timestamp).toBe(genesisBlock.timestamp)
    expect(resultBlock.number).toBe(0n)
  })
})
