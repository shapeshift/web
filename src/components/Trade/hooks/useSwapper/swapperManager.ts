import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import stableStringify from 'fast-json-stable-stringify'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { SwapperManager } from 'lib/swapper/manager/SwapperManager'
import type { CowChainId } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { CowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { LifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper'
import { OneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper'
import { OsmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper'
import { ThorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { ZrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'

// singleton - do not export me, use getSwapperManager
let _swapperManager: Promise<SwapperManager> | undefined

// singleton - do not export me
// Used to short circuit calls to getSwapperManager if flags have not changed
let previousFlags: string = ''

export const _getSwapperManager = async (flags: FeatureFlags): Promise<SwapperManager> => {
  // instantiate if it doesn't already exist
  const swapperManager = new SwapperManager()
  const adapterManager = getChainAdapterManager()

  if (flags.Cowswap) {
    const supportedChainIds: CowChainId[] = flags.CowswapGnosis
      ? [KnownChainIds.GnosisMainnet, KnownChainIds.EthereumMainnet]
      : [KnownChainIds.EthereumMainnet]
    const cowSwapper = new CowSwapper(supportedChainIds)
    swapperManager.addSwapper(cowSwapper)
  }

  if (flags.ZrxSwap) {
    const zrxSwapper = new ZrxSwapper()
    swapperManager.addSwapper(zrxSwapper)
  }

  if (flags.ThorSwap) {
    const thorSwapper = new ThorchainSwapper()
    await thorSwapper.initialize()
    swapperManager.addSwapper(thorSwapper)
  }

  if (flags.OsmosisSwap) {
    const osmoUrl = `${getConfig().REACT_APP_OSMOSIS_NODE_URL}/lcd`
    const cosmosUrl = `${getConfig().REACT_APP_COSMOS_NODE_URL}/lcd`
    const osmoSwapper = new OsmosisSwapper({ adapterManager, osmoUrl, cosmosUrl })
    swapperManager.addSwapper(osmoSwapper)
  }

  if (flags.LifiSwap) {
    const lifiSwapper = new LifiSwapper()
    await lifiSwapper.initialize()
    swapperManager.addSwapper(lifiSwapper)
  }

  if (flags.OneInch) {
    const oneInchApiUrl = getConfig().REACT_APP_ONE_INCH_API_URL
    const oneInchSwapper = new OneInchSwapper({ apiUrl: oneInchApiUrl })
    swapperManager.addSwapper(oneInchSwapper)
  }

  return swapperManager
}

export const getSwapperManager = (flags: FeatureFlags): Promise<SwapperManager> => {
  const flagsChanged = previousFlags !== stableStringify(flags)
  if (!_swapperManager || flagsChanged) {
    _swapperManager = _getSwapperManager(flags)
    previousFlags = stableStringify(flags)
  }

  return _swapperManager
}
