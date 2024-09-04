import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { EvmChainId } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'

export const useEvmBlockNumber = (chainId: EvmChainId | undefined, enabled: boolean) => {
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
