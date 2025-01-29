import { getEthersProvider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'

export const AVERAGE_BLOCK_TIME_BLOCKS = 1000

export const findClosestFoxDiscountDelayBlockNumber = async (
  delayHours: number,
): Promise<number> => {
  const latestBlock = await getEthersProvider(KnownChainIds.EthereumMainnet).getBlock('latest')
  if (!latestBlock) throw new Error('Could not get latest block')

  // No-op - if delay is zero, we don't need to perform any logic to find the closest FOX discounts delay block number
  // Since the block we're interested in is the current one
  if (delayHours === 0) return latestBlock.number

  const historicalBlock = await getEthersProvider(KnownChainIds.EthereumMainnet).getBlock(
    latestBlock.number - AVERAGE_BLOCK_TIME_BLOCKS,
  )
  if (!historicalBlock)
    throw new Error(`Could not get block ${AVERAGE_BLOCK_TIME_BLOCKS} blocks ago`)

  const averageBlockTimeSeconds =
    (latestBlock.timestamp - historicalBlock.timestamp) / AVERAGE_BLOCK_TIME_BLOCKS

  const delaySeconds = 60 * 60 * delayHours
  const targetBlocksToMove = Math.floor(delaySeconds / averageBlockTimeSeconds)
  const targetTimestamp = latestBlock.timestamp - delaySeconds

  let blockNumber = latestBlock.number - targetBlocksToMove
  while (true) {
    const block = await getEthersProvider(KnownChainIds.EthereumMainnet).getBlock(blockNumber)
    if (!block) throw new Error(`Could not get block ${blockNumber}`)

    const timeDifference = targetTimestamp - block.timestamp

    // Block is within 1 block before the target timestamp and can be used for fox discount snapshot
    if (timeDifference >= 0 && timeDifference <= averageBlockTimeSeconds) {
      return blockNumber
    }

    // Calculate how many blocks to move based on time difference and average block time
    const blocksToMove = Math.ceil(Math.abs(timeDifference) / averageBlockTimeSeconds)

    if (block.timestamp > targetTimestamp) {
      blockNumber -= blocksToMove
    } else {
      blockNumber += blocksToMove
    }
  }
}
