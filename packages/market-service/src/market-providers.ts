import { JsonRpcProvider } from '@ethersproject/providers'
import { Yearn } from '@yfi/sdk'

import { CoinCapMarketService } from './coincap/coincap'
import { CoinGeckoMarketService } from './coingecko/coingecko'
import { YearnMarketCapService } from './yearn/yearn'
// YearnMarketCapService deps
const provider = new JsonRpcProvider(process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL)
const yearnSdk = new Yearn(1, { provider })

// Order of this MarketProviders array constitutes the order of provders we will be checking first.
// More reliable providers should be listed first.
export const MarketProviders = [
  new CoinGeckoMarketService(),
  new CoinCapMarketService(),
  new YearnMarketCapService({ yearnSdk })
]
