import { useEffect, useState } from 'react'

import { getEthersProvider } from '../utils'

const web3Provider = getEthersProvider()

export const useCurrentBlockNumber = () => {
  const [block, setBlock] = useState<number | null>(null)

  useEffect(() => {
    if (!web3Provider || block) return

    web3Provider
      .getBlockNumber()
      .then(setBlock)
      .catch(error => console.error(`Failed to get block number for chainId:`, error))
  }, [block])

  return block
}
