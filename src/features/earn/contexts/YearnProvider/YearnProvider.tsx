import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { YearnVaultApi } from 'features/earn/providers/yearn/api/api'
import React, { useContext, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'

const YearnContext = React.createContext<YearnVaultApi | null>(null)

export const useYearn = () => {
  const context = useContext(YearnContext)
  if (!context) throw new Error("useYearn can't be used outside of the YearnProvider")
  return context
}

export const YearnProvider: React.FC = ({ children }) => {
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

  return <YearnContext.Provider value={yearn}>{children}</YearnContext.Provider>
}
