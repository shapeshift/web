import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { getEthersProvider } from 'lib/ethersProviderSingleton'

dayjs.extend(duration)
const ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS = 12.08

export const findClosestFoxDiscountDelayBlockNumber = async (): Promise<number> => {
  const currentBlock = await getEthersProvider().getBlockNumber()
  const currentBlockInfo = await getEthersProvider().getBlock(currentBlock)
  // Since the delay is set to 0 as per the TMDC, the targetTimestamp is currentBlock - 0 i.e still the current block
  const targetTimestamp = currentBlockInfo.timestamp
  // Define a tolerance window as half of the average block time.

  let startBlock = currentBlock
  let closestBlockNumber: number | null = null

  // Interpolate to find a smarter starting point.
  const timeDifference = currentBlockInfo.timestamp - targetTimestamp
  const blocksToMove = Math.floor(timeDifference / ETHEREUM_AVERAGE_BLOCK_TIME_SECONDS)

  startBlock -= blocksToMove

  // TODO(gomes): now that the target *is* the current block, this method is now useless?
  // i.e we will hit the first branch of the while loop in the first iteration and return the current block,
  // so all we need is to consume await getEthersProvider().getBlockNumber() instead of this?
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
