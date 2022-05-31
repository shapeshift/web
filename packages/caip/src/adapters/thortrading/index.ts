import { fromAssetId, toAssetId } from '../../assetId/assetId'
import { btcAssetId, ethAssetId, ethChainId } from '../../constants'
import { AssetId } from './../../assetId/assetId'
import { btcChainId } from './../../constants'

// naming convention for regex variables are taken from thorchian docs
// https://dev.thorchain.org/thorchain-dev/memos#asset-notation
// https://regex101.com/r/MAj4WA/1
const thorIdRegex = /(?<chain>[A-Za-z]+)\.(?<ticker>[A-Za-z]+)(-(?<id>[A-Za-z0-9]+))?/

/*
 * Note: this only works with thorchain assets we support
 * see https://dev.thorchain.org/thorchain-dev/memos#asset-notation for reference
 *
 * We are also not supporting asset abbreviations using fuzzy logic at this time
 * see https://dev.thorchain.org/thorchain-dev/memos#asset-abbreviations
 */
export const poolAssetIdToAssetId = (id: string): AssetId | undefined => {
  const matches = thorIdRegex.exec(id)?.groups
  // To avoid any case sensitive issues, uppercase both chain and ticker.
  const chain = matches?.chain.toUpperCase()
  const ticker = matches?.ticker.toUpperCase()
  const contractAddress = matches?.id

  switch (chain) {
    case 'ETH': {
      if (ticker === 'ETH') return ethAssetId

      // We make Eth contract addresses lower case to simplify comparisons
      const assetReference = contractAddress?.toLowerCase()
      if (!assetReference) return undefined

      const chainId = ethChainId
      const assetNamespace = 'erc20'

      try {
        return toAssetId({ chainId, assetNamespace, assetReference })
      } catch (e) {
        console.error(e)
        return undefined
      }
    }
    case 'BTC': {
      return btcAssetId
    }
    default: {
      return undefined
    }
  }
}

export const assetIdToPoolAssetId = ({
  assetId,
  symbol
}: {
  assetId: AssetId
  symbol?: string
}): string | undefined => {
  try {
    const { chainId, assetReference } = fromAssetId(assetId)
    // https://dev.thorchain.org/thorchain-dev/memos#asset-notation
    switch (chainId) {
      case ethChainId: {
        if (assetId === ethAssetId) return 'ETH.ETH'
        if (!symbol) return undefined
        // this is predicated on the assumption that the symbol from the asset service
        // and the contract address are static, correct, and won't ever change. Midgard
        // also returns the asset notation with the assetReference in uppercase format,
        // so we will keep that consistent here and uppercase it.
        return `ETH.${symbol}-${assetReference.toUpperCase()}`
      }
      case btcChainId: {
        return 'BTC.BTC'
      }
      default: {
        return undefined
      }
    }
  } catch (e) {
    return undefined
  }
}
