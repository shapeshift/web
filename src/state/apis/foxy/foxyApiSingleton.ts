import type { EvmBaseAdapter } from '@shapeshiftmonorepo/chain-adapters'
import { getEthersProvider } from '@shapeshiftmonorepo/contracts'
import { KnownChainIds } from '@shapeshiftmonorepo/types'

import { getConfig } from '@/config'
import { foxyAddresses, FoxyApi } from '@/lib/investor/investor-foxy'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

// don't export me, access me through the getter
let _foxyApi: FoxyApi | undefined = undefined

// we need to be able to access this outside react
export const getFoxyApi = (): FoxyApi => {
  const RPC_PROVIDER_ENV = 'VITE_ETHEREUM_NODE_URL'

  if (_foxyApi) return _foxyApi

  const foxyApi = new FoxyApi({
    adapter: assertGetEvmChainAdapter(
      KnownChainIds.EthereumMainnet,
    ) as EvmBaseAdapter<KnownChainIds.EthereumMainnet>,
    providerUrl: getConfig()[RPC_PROVIDER_ENV],
    foxyAddresses,
    provider: getEthersProvider(KnownChainIds.EthereumMainnet),
  })

  _foxyApi = foxyApi

  return _foxyApi
}
