import { useEffect, useState } from 'react'

import { getEthersProvider } from '../utils'

export const useCurrentBlockNumber = () => {
  const [block, setBlock] = useState<number | null>(null)

  // attach/detach listeners
  useEffect(() => {
    const web3Provider = getEthersProvider()
    if (!web3Provider) return

    setBlock(null)

    web3Provider
      .getBlockNumber()
      .then(setBlock)
      .catch(error => console.error(`Failed to get block number for chainId:`, error))

    web3Provider.on('block', setBlock)
    return () => {
      web3Provider.off('block', setBlock)
    }
  }, [])

  return block
}
