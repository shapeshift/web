import type { ChainId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { assertGetViemClient } from 'lib/viem-client'

export const useBlockNumber = (chainId: ChainId | undefined, enabled: boolean) => {
  const [blockNumber, setBlockNumber] = useState<bigint>()

  useEffect(() => {
    if (!enabled || !chainId) return

    const client = assertGetViemClient(chainId)

    const stopWatching = client.watchBlockNumber({
      onBlockNumber: setBlockNumber,
      onError: undefined,
    })

    // return the cleanup function to stop polling
    return stopWatching
  }, [chainId, enabled])

  return blockNumber
}
