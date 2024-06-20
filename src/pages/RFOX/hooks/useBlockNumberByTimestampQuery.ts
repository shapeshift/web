import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'

type BlockNumberByTimestampQueryKey = ['blockNumberByTimestamp', { targetTimestamp: bigint }]

/**
 * @param targetTimestamp The target timestamp in seconds - not required to be an actual block timestamp
 */
type UseBlockNumberByTimestampQueryProps = {
  targetTimestamp: bigint
}

const AVERAGE_BLOCK_TIME_BLOCKS = 1000n

const client = viemClientByNetworkId[arbitrum.id]

export const getBlockNumberByTimestampQueryKey = ({
  targetTimestamp,
}: UseBlockNumberByTimestampQueryProps): BlockNumberByTimestampQueryKey => [
  'blockNumberByTimestamp',
  { targetTimestamp },
]

export const getBlockNumberByTimestampQueryFn =
  ({ targetTimestamp }: UseBlockNumberByTimestampQueryProps) =>
  async () => {
    const latestBlock = await client.getBlock()

    const historicalBlock = await client.getBlock({
      blockNumber: latestBlock.number - AVERAGE_BLOCK_TIME_BLOCKS,
    })

    const averageBlockTimeSeconds =
      (latestBlock.timestamp - historicalBlock.timestamp) / AVERAGE_BLOCK_TIME_BLOCKS

    const delaySeconds = latestBlock.timestamp - targetTimestamp
    const targetBlocksToMove = delaySeconds / averageBlockTimeSeconds

    let blockNumber = latestBlock.number - targetBlocksToMove

    while (true) {
      const block = await client.getBlock({ blockNumber })

      const timeDifference = targetTimestamp - block.timestamp

      // Block is within 1 block before the target timestamp
      if (timeDifference >= 0 && timeDifference <= averageBlockTimeSeconds) {
        return blockNumber
      }

      // Calculate how many blocks to move based on time difference and average block time
      const blocksToMove = BigInt(
        Math.ceil(Math.abs(Number(timeDifference)) / Number(averageBlockTimeSeconds)),
      )

      if (block.timestamp > targetTimestamp) {
        blockNumber -= blocksToMove
      } else {
        blockNumber += blocksToMove
      }
    }
  }

export const useBlockNumberByTimestampQuery = ({
  targetTimestamp,
}: UseBlockNumberByTimestampQueryProps) => {
  const queryKey: BlockNumberByTimestampQueryKey = useMemo(
    () => getBlockNumberByTimestampQueryKey({ targetTimestamp }),
    [targetTimestamp],
  )

  const queryFn = useMemo(
    () => getBlockNumberByTimestampQueryFn({ targetTimestamp }),
    [targetTimestamp],
  )

  const query = useQuery({
    queryKey,
    queryFn,
  })

  return query
}
