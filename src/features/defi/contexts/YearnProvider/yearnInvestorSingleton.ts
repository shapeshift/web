import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { YearnInvestor } from '@shapeshiftoss/investor-yearn'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

let maybeYearnInvestor: YearnInvestor | undefined
export const getYearnInvestor = () => {
  debugger
  if (maybeYearnInvestor) return maybeYearnInvestor

  maybeYearnInvestor = new YearnInvestor({
    chainAdapter: getChainAdapterManager().get(
      KnownChainIds.EthereumMainnet,
    ) as ChainAdapter<KnownChainIds.EthereumMainnet>,
    providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
  })

  return maybeYearnInvestor
}
