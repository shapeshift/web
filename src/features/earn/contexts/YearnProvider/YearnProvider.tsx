import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { YearnVaultApi } from 'features/earn/providers/yearn/api/api'
import React, { useContext, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'

type YearnContextProps = {
  loading: boolean
  yearn: YearnVaultApi | null
}

const YearnContext = React.createContext<YearnContextProps | null>(null)

export const useYearn = () => {
  const context = useContext(YearnContext)
  if (!context) throw new Error("useYearn can't be used outside of the YearnProvider")
  return context
}

export const YearnProvider: React.FC = ({ children }) => {
  const [yearn, setYearn] = useState<YearnVaultApi | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const adapters = useChainAdapters()

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const api = new YearnVaultApi({
          adapter: adapters.byChain(ChainTypes.Ethereum),
          providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL
        })
        await api.initialize()
        setYearn(api)
      } catch (error) {
        console.error('YearnManager: error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [adapters])

  return <YearnContext.Provider value={{ yearn, loading }}>{children}</YearnContext.Provider>
}
