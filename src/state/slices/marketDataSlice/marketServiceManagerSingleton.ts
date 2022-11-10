// do not directly use or export, singleton
import { MarketServiceManager } from '@shapeshiftoss/market-service'
import { getConfig } from 'config'

let _marketServiceManager: MarketServiceManager | undefined

type GetMarketServiceManager = () => MarketServiceManager

export const getMarketServiceManager: GetMarketServiceManager = () => {
  const config = getConfig()
  if (!_marketServiceManager) {
    _marketServiceManager = new MarketServiceManager({
      coinGeckoAPIKey: config.REACT_APP_COINGECKO_API_KEY,
      yearnChainReference: 1,
      providerUrls: {
        jsonRpcProviderUrl: config.REACT_APP_ETHEREUM_NODE_URL,
        unchainedEthereumHttpUrl: config.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
        unchainedEthereumWsUrl: config.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
      },
    })
  }
  return _marketServiceManager
}
