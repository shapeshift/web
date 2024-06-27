import { useQuery } from '@tanstack/react-query'
import assert from 'assert'
import { useMemo } from 'react'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'
import { viemClientByNetworkId } from 'lib/viem-client'

type BlockNumberByTimestampQueryKey = ['blockNumberByTimestamp', string]

/**
 * @param targetTimestamp The target timestamp in seconds - not an actual block timestamp
 */
type UseEarliestBlockNumberByTimestampQueryProps = {
  targetTimestamp: bigint
}

const AVERAGE_BLOCK_TIME_BLOCK_DISTANCE = 10_000

const client = viemClientByNetworkId[arbitrum.id]

const calcNumberBlocksToMove = (timeDifferenceSeconds: bigint, averageBlockTimeSeconds: number) => {
  const blocksToMove = BigInt(
    Math.floor(Math.abs(Number(timeDifferenceSeconds)) / averageBlockTimeSeconds),
  )

  return timeDifferenceSeconds > 0 ? blocksToMove : -blocksToMove
}

export const getEarliestBlockNumberByTimestampQueryKey = ({
  targetTimestamp,
}: UseEarliestBlockNumberByTimestampQueryProps): BlockNumberByTimestampQueryKey => [
  'blockNumberByTimestamp',
  serialize({ targetTimestamp }),
]

export const getEarliestBlockNumberByTimestampQueryFn =
  ({
    targetTimestamp,
    averageBlockTimeBlockDistance = AVERAGE_BLOCK_TIME_BLOCK_DISTANCE,
  }: UseEarliestBlockNumberByTimestampQueryProps & { averageBlockTimeBlockDistance?: number }) =>
  async () => {
    const latestBlock = await client.getBlock()

    assert(targetTimestamp <= latestBlock.timestamp, 'Target timestamp must not be in the future')

    const historicalBlock = await client.getBlock({
      blockNumber: latestBlock.number - BigInt(averageBlockTimeBlockDistance),
    })

    const averageBlockTimeSeconds =
      Number(latestBlock.timestamp - historicalBlock.timestamp) / averageBlockTimeBlockDistance
    const timeDifferenceSeconds = latestBlock.timestamp - targetTimestamp
    const targetBlocksToMove = calcNumberBlocksToMove(
      timeDifferenceSeconds,
      averageBlockTimeSeconds,
    )

    let blockNumber = latestBlock.number - targetBlocksToMove

    while (true) {
      if (blockNumber <= 0n) {
        return 0n
      }

      const block = await client.getBlock({ blockNumber })
      const timeDifferenceSeconds = targetTimestamp - block.timestamp

      // Block is within 1 block before the target timestamp
      if (timeDifferenceSeconds >= 0n && timeDifferenceSeconds <= averageBlockTimeSeconds) {
        break
      }

      const blocksToMove = calcNumberBlocksToMove(timeDifferenceSeconds, averageBlockTimeSeconds)
      blockNumber += blocksToMove
    }

    // We now have *a* block number that is sits at the target timestamp, but on arbitrum there are several.
    // We must now walk backward to find the earliest one.
    while (true) {
      if (blockNumber <= 0n) {
        return 0n
      }

      const block = await client.getBlock({ blockNumber: blockNumber - 1n })

      if (block.timestamp !== targetTimestamp) {
        break
      }

      blockNumber--
    }

    return blockNumber
  }

export const useEarliestBlockNumberByTimestampQuery = ({
  targetTimestamp,
}: UseEarliestBlockNumberByTimestampQueryProps) => {
  const queryKey: BlockNumberByTimestampQueryKey = useMemo(
    () => getEarliestBlockNumberByTimestampQueryKey({ targetTimestamp }),
    [targetTimestamp],
  )

  const queryFn = useMemo(
    () => getEarliestBlockNumberByTimestampQueryFn({ targetTimestamp }),
    [targetTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}
