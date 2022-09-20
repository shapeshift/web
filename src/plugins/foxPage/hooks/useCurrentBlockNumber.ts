import { useEffect, useState } from 'react'
import { logger } from 'lib/logger'

import { getEthersProvider } from '../utils'
const moduleLogger = logger.child({ namespace: ['useCurrentBlockNumber'] })

// TODO: use wagmi provider
const maybeEthersProvider = (skip?: boolean) => (skip ? null : getEthersProvider())

type UseCurrentBlockNumberInput = {
  skip?: boolean
}

// TODO: remove and wagmi useBlockNumber() with infinite caching
export const useCurrentBlockNumber = ({ skip }: UseCurrentBlockNumberInput = {}) => {
  const [block, setBlock] = useState<number | null>(null)

  useEffect(() => {
    if (skip || block) return

    const web3Provider = maybeEthersProvider()

    if (!web3Provider) return

    web3Provider
      .getBlockNumber()
      .then(setBlock)
      .catch(error => moduleLogger.error(error))
  }, [skip, block])

  return block
}
