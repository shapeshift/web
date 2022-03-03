import { JsonRpcProvider } from '@ethersproject/providers'
import { Yearn } from '@yfi/sdk'

import { CoinCapMarketService } from './coincap/coincap'
import { CoinGeckoMarketService } from './coingecko/coingecko'
import { OsmosisMarketService } from './osmosis/osmosis'
import { YearnTokenMarketCapService } from './yearn/yearn-tokens'
import { YearnVaultMarketCapService } from './yearn/yearn-vaults'
// YearnVaultMarketCapService deps
const network = 1 // 1 for mainnet
const provider = new JsonRpcProvider(process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL)
const yearnSdk = new Yearn(network, { provider, disableAllowlist: true })

// Order of this MarketProviders array constitutes the order of provders we will be checking first.
// More reliable providers should be listed first.
export const MarketProviders = [
  new CoinGeckoMarketService(),
  new CoinCapMarketService(),
  new YearnVaultMarketCapService({ yearnSdk }),
  new YearnTokenMarketCapService({ yearnSdk }),
  new OsmosisMarketService()
]
