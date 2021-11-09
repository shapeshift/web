import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'

import { YearnVaultApi } from '../api/api'

export const useYearnManager = () => {
  const [yearn, setYearn] = useState<YearnVaultApi | null>(null)
  const adapters = useChainAdapters()

  useEffect(() => {
    ;(async () => {
      try {
        const api = new YearnVaultApi({
          adapter: adapters.byChain(ChainTypes.Ethereum),
          providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL
        })
        await api.initialize()
        setYearn(api)
      } catch (error) {
        console.error('YearnManager: error', error)
      }
    })()
  }, [adapters])

  return yearn
}
