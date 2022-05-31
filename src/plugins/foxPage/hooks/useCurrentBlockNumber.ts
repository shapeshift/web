import { useCallback, useEffect, useState } from 'react'

import { getEthersProvider } from '../utils'

export const useCurrentBlockNumber = () => {
  const [block, setBlock] = useState<number | null>(null)
  const blockNumberCallback = useCallback(
    (blockNumber: number) => {
      setBlock(blockNumber)
    },
    [setBlock],
  )

  // attach/detach listeners
  useEffect(() => {
    const web3Provider = getEthersProvider()
    if (!web3Provider) return

    setBlock(null)

    web3Provider
      .getBlockNumber()
      .then(blockNumberCallback)
      .catch(error => console.error(`Failed to get block number for chainId:`, error))

    web3Provider.on('block', blockNumberCallback)
    return () => {
      web3Provider.off('block', blockNumberCallback)
    }
  }, [blockNumberCallback])

  return block
}
