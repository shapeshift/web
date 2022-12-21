import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { OsmosisInvestor } from '@shapeshiftoss/investor-osmosis'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// don't export me, access me through the getter
let _osmosisInvestor: OsmosisInvestor | undefined = undefined

// we need to be able to access this outside react
export const getOsmosisInvestor = (): OsmosisInvestor => {
  if (_osmosisInvestor) return _osmosisInvestor

  const osmosisInvestor = new OsmosisInvestor({
    chainAdapter: getChainAdapterManager().get(
      KnownChainIds.OsmosisMainnet,
    ) as ChainAdapter<KnownChainIds.OsmosisMainnet>,
    providerUrl: getConfig().REACT_APP_OSMOSIS_NODE_URL,
  })

  _osmosisInvestor = osmosisInvestor

  return _osmosisInvestor
}
