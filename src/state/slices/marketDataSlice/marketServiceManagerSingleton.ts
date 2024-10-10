// do not directly use or export, singleton
import { getEthersProvider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { MarketServiceManager } from 'lib/market-service'

let _marketServiceManager: MarketServiceManager | undefined
let _initializationPromise: Promise<MarketServiceManager> | null = null

type GetMarketServiceManager = () => Promise<MarketServiceManager>

export const getMarketServiceManager: GetMarketServiceManager = () => {
  if (_marketServiceManager) {
    return Promise.resolve(_marketServiceManager)
  }

  if (!_initializationPromise) {
    _initializationPromise = initializeMarketServiceManager()
  }

  return _initializationPromise
}

async function initializeMarketServiceManager(): Promise<MarketServiceManager> {
  const config = getConfig()
  _marketServiceManager = await MarketServiceManager.initialize({
    yearnChainReference: 1, // CHAIN_REFERENCE.EthereumMainnet is '1', yearn requires strict number union
    provider: getEthersProvider(KnownChainIds.EthereumMainnet),
    providerUrls: {
      jsonRpcProviderUrl: config.REACT_APP_ETHEREUM_NODE_URL,
      unchainedEthereumHttpUrl: config.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
      unchainedEthereumWsUrl: config.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
    },
  })
  _initializationPromise = null
  return _marketServiceManager
}
