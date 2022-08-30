import { useEffect, useState } from 'react'
import { logger } from 'lib/logger'

import { getEthersProvider } from '../utils'
const moduleLogger = logger.child({ namespace: ['useCurrentBlockNumber'] })

const web3Provider = getEthersProvider()

export const useCurrentBlockNumber = () => {
  const [block, setBlock] = useState<number | null>(null)

  useEffect(() => {
    if (!web3Provider || block) return

    web3Provider
      .getBlockNumber()
      .then(setBlock)
      .catch(error => moduleLogger.error(error))
  }, [block])

  return block
}
