import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { getEthersProvider } from 'lib/ethersProviderSingleton'

import { FOX_DISCOUNT_DELAY_HOURS } from './parameters'

dayjs.extend(duration)
const ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS = 12.08

export const findClosestFoxDiscountDelayBlockNumber = async (): Promise<number> => {
  const currentBlock = await getEthersProvider().getBlockNumber()
  const dayjsDelay = dayjs.duration(FOX_DISCOUNT_DELAY_HOURS, 'hours')
  const targetTimestamp = dayjs().subtract(dayjsDelay).unix()
  // Define a tolerance window as half of the average block time.

  let startBlock = currentBlock
  let closestBlockNumber: number | null = null

  // Interpolate to find a smarter starting point.
  const currentBlockInfo = await getEthersProvider().getBlock(currentBlock)
  const timeDifference = currentBlockInfo.timestamp - targetTimestamp
  const blocksToMove = Math.floor(timeDifference / ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS)

  startBlock -= blocksToMove

  while (closestBlockNumber === null) {
    const startBlockInfo = await getEthersProvider().getBlock(startBlock)

    if (
      Math.abs(targetTimestamp - startBlockInfo.timestamp) <= ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS
    ) {
      closestBlockNumber = startBlock
    } else {
      // Calculate how many blocks to jump based on time difference and average block time
      const timeDifference = Math.abs(targetTimestamp - startBlockInfo.timestamp)
      const blocksToJump = Math.floor(timeDifference / ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS)

      if (startBlockInfo.timestamp > targetTimestamp) {
        startBlock -= blocksToJump || 1 // In case blocksToJump calculates to 0, default to 1
      } else {
        startBlock += blocksToJump || 1 // In case blocksToJump calculates to 0, default to 1
      }
    }
  }

  return closestBlockNumber
}
