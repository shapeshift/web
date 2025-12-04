import type { AssetNamespace } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from './assertUnreachable'

export const getAssetNamespaceFromChainId = (chainId: KnownChainIds): AssetNamespace => {
  switch (chainId) {
    case KnownChainIds.SolanaMainnet:
      return ASSET_NAMESPACE.splToken
    case KnownChainIds.SuiMainnet:
      return ASSET_NAMESPACE.slip44
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.OptimismMainnet:
    case KnownChainIds.PolygonMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.ArbitrumNovaMainnet:
    case KnownChainIds.BaseMainnet:
    case KnownChainIds.BnbSmartChainMainnet:
    case KnownChainIds.MonadMainnet:
    case KnownChainIds.HyperEvmMainnet:
      return ASSET_NAMESPACE.erc20
    case KnownChainIds.CosmosMainnet:
    case KnownChainIds.BitcoinMainnet:
    case KnownChainIds.BitcoinCashMainnet:
    case KnownChainIds.DogecoinMainnet:
    case KnownChainIds.LitecoinMainnet:
    case KnownChainIds.ThorchainMainnet:
    case KnownChainIds.MayachainMainnet:
    case KnownChainIds.TronMainnet:
      throw Error(`Unhandled case '${chainId}'`)
    default:
      return assertUnreachable(chainId)
  }
}
