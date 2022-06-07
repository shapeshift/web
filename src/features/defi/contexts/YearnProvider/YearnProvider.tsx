import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { YearnInvestor } from '@shapeshiftoss/investor-yearn'
import { ChainTypes } from '@shapeshiftoss/types'
import { getConfig as getEthereumConfig } from 'plugins/ethereum/config'
import React, { useContext, useEffect, useState } from 'react'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

type YearnContextProps = {
  loading: boolean
  yearn: YearnInvestor | null
}

const YearnContext = React.createContext<YearnContextProps | null>(null)

export const useYearn = () => {
  const context = useContext(YearnContext)
  if (!context) throw new Error("useYearn can't be used outside of the YearnProvider")
  return context
}

export const YearnProvider: React.FC = ({ children }) => {
  const [yearn, setYearn] = useState<YearnInvestor | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const { chainAdapterManager } = usePlugins()

  useEffect(() => {
    ;(async () => {
      try {
        if (!chainAdapterManager.getSupportedChains().includes(ChainTypes.Ethereum)) return
        setLoading(true)
        const chainAdapter = chainAdapterManager.byChainId(
          'eip155:1',
        ) as ChainAdapter<ChainTypes.Ethereum>
        const yearnInvestor = new YearnInvestor({
          chainAdapter,
          providerUrl: getEthereumConfig().REACT_APP_ETHEREUM_NODE_URL,
        })
        await yearnInvestor.initialize()
        setYearn(yearnInvestor)
      } catch (error) {
        console.error('YearnManager: error', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [chainAdapterManager])

  return <YearnContext.Provider value={{ yearn, loading }}>{children}</YearnContext.Provider>
}
