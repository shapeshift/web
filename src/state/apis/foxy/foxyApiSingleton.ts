import type { ChainAdapter } from '@keepkey/chain-adapters'
import { foxyAddresses, FoxyApi } from '@keepkey/investor-foxy'
import { KnownChainIds } from '@keepkey/types'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// don't export me, access me through the getter
let _foxyApi: FoxyApi | undefined = undefined

// we need to be able to access this outside react
export const getFoxyApi = (): FoxyApi => {
  if (_foxyApi) return _foxyApi

  const foxyApi = new FoxyApi({
    adapter: getChainAdapterManager().get(
      KnownChainIds.EthereumMainnet,
    ) as ChainAdapter<KnownChainIds.EthereumMainnet>,
    providerUrl: getConfig().REACT_APP_ETHEREUM_INFURA_URL,
    foxyAddresses,
  })

  _foxyApi = foxyApi

  return _foxyApi
}
