import type { ChainAdapter } from '@keepkey/chain-adapters'
import { YearnInvestor } from '@keepkey/investor-yearn'
import type { KnownChainIds } from '@keepkey/types'
import { getConfig } from 'config'

let maybeYearnInvestor: YearnInvestor | undefined
export const getYearnInvestor = (chainAdapter: ChainAdapter<KnownChainIds.EthereumMainnet>) => {
  if (maybeYearnInvestor) return maybeYearnInvestor

  maybeYearnInvestor = new YearnInvestor({
    chainAdapter,
    providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
  })

  return maybeYearnInvestor
}
