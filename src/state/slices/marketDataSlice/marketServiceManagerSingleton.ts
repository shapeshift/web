// do not directly use or export, singleton
import { getConfig } from 'config'
import { MarketServiceManager } from 'lib/market-service'

let _marketServiceManager: MarketServiceManager | undefined

type GetMarketServiceManager = () => MarketServiceManager

export const getMarketServiceManager: GetMarketServiceManager = () => {
  const config = getConfig()
  if (!_marketServiceManager) {
    _marketServiceManager = new MarketServiceManager({
      yearnChainReference: 1, // CHAIN_REFERENCE.EthereumMainnet is '1', yearn requires strict number union
      providerUrls: {
        jsonRpcProviderUrl: config.REACT_APP_ETHEREUM_NODE_URL,
        unchainedEthereumHttpUrl: config.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
        unchainedEthereumWsUrl: config.REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
        osmosisMarketDataUrl: config.REACT_APP_OSMOSIS_IMPERATOR_BASE_URL,
        osmosisPoolMetadataUrl: config.REACT_APP_OSMOSIS_LCD_BASE_URL,
      },
    })
  }
  return _marketServiceManager
}
