import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { foxyAddresses, FoxyApi } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// don't export me, access me through the getter
let _foxyApi: FoxyApi | undefined = undefined

// we need to be able to access this outside react
export const getFoxyApi = (): FoxyApi => {
  // Infura requests are origin restricted upstream to *.shapeshift.com
  // Using our own node locally allows FOXy development, though the balances aren't guaranteed to be accurate
  // since our archival node isn't fully synced yet
  const isLocalhost = window.location.hostname === 'localhost'
  const RPC_PROVIDER_ENV = isLocalhost
    ? 'REACT_APP_ETHEREUM_NODE_URL'
    : 'REACT_APP_ETHEREUM_INFURA_URL'

  if (_foxyApi) return _foxyApi

  const foxyApi = new FoxyApi({
    adapter: getChainAdapterManager().get(
      KnownChainIds.EthereumMainnet,
    ) as ChainAdapter<KnownChainIds.EthereumMainnet>,
    providerUrl: getConfig()[RPC_PROVIDER_ENV],
    foxyAddresses,
  })

  _foxyApi = foxyApi

  return _foxyApi
}
