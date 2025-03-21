// do not directly use or export, singleton
import { getEthersProvider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { MarketServiceManager } from '@/lib/market-service'

let _marketServiceManager: MarketServiceManager | undefined

type GetMarketServiceManager = () => MarketServiceManager

export const getMarketServiceManager: GetMarketServiceManager = () => {
  const config = getConfig()
  if (!_marketServiceManager) {
    _marketServiceManager = new MarketServiceManager({
      provider: getEthersProvider(KnownChainIds.EthereumMainnet),
      providerUrls: {
        jsonRpcProviderUrl: config.VITE_ETHEREUM_NODE_URL,
        unchainedEthereumHttpUrl: config.VITE_UNCHAINED_ETHEREUM_HTTP_URL,
        unchainedEthereumWsUrl: config.VITE_UNCHAINED_ETHEREUM_WS_URL,
      },
    })
  }
  return _marketServiceManager
}
