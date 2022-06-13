import { CHAIN_NAMESPACE, CHAIN_REFERENCE, ChainId, fromChainId } from '@shapeshiftoss/caip'

// https://www.coingecko.com/en/api/documentation - See asset_platforms
export const chainIdToCoingeckoAssetPlatform = (chainId: ChainId): string => {
  const { chainNamespace, chainReference } = fromChainId(chainId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Ethereum:
      return 'ethereum'
    case CHAIN_NAMESPACE.Cosmos:
      switch (chainReference) {
        case CHAIN_REFERENCE.CosmosHubMainnet:
          return 'cosmos'
        case CHAIN_REFERENCE.OsmosisMainnet:
          return 'osmosis'
        default:
          throw new Error(
            `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`
          )
      }
    // Bitcoin is not a valid asset platform: https://api.coingecko.com/api/v3/asset_platforms
    case CHAIN_NAMESPACE.Bitcoin:
    default:
      throw new Error(
        `chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`
      )
  }
}
