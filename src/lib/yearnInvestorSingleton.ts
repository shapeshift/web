import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { YearnInvestor } from '@shapeshiftoss/investor-yearn'
import type { KnownChainIds } from '@shapeshiftoss/types'
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
