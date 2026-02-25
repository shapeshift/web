import type { AssetNamespace } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from './assertUnreachable'

export const getAssetNamespaceFromChainId = (chainId: KnownChainIds): AssetNamespace => {
  switch (chainId) {
    case KnownChainIds.SolanaMainnet:
      return ASSET_NAMESPACE.splToken
    case KnownChainIds.SuiMainnet:
      return ASSET_NAMESPACE.suiCoin
    case KnownChainIds.NearMainnet:
      return ASSET_NAMESPACE.nep141
    case KnownChainIds.TronMainnet:
      return ASSET_NAMESPACE.trc20
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.OptimismMainnet:
    case KnownChainIds.PolygonMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.BaseMainnet:
    case KnownChainIds.BnbSmartChainMainnet:
    case KnownChainIds.MonadMainnet:
    case KnownChainIds.HyperEvmMainnet:
    case KnownChainIds.PlasmaMainnet:
    case KnownChainIds.MantleMainnet:
    case KnownChainIds.InkMainnet:
    case KnownChainIds.MegaEthMainnet:
    case KnownChainIds.BerachainMainnet:
    case KnownChainIds.CronosMainnet:
    case KnownChainIds.KatanaMainnet:
    case KnownChainIds.EtherealMainnet:
    case KnownChainIds.CeloMainnet:
    case KnownChainIds.FlowEvmMainnet:
    case KnownChainIds.PlumeMainnet:
    case KnownChainIds.StoryMainnet:
    case KnownChainIds.ZkSyncEraMainnet:
    case KnownChainIds.BlastMainnet:
    case KnownChainIds.WorldChainMainnet:
    case KnownChainIds.HemiMainnet:
    case KnownChainIds.SeiMainnet:
    case KnownChainIds.LineaMainnet:
    case KnownChainIds.ScrollMainnet:
    case KnownChainIds.SonicMainnet:
    case KnownChainIds.UnichainMainnet:
    case KnownChainIds.BobMainnet:
    case KnownChainIds.ModeMainnet:
    case KnownChainIds.SoneiumMainnet:
      return ASSET_NAMESPACE.erc20
    case KnownChainIds.StarknetMainnet:
      return ASSET_NAMESPACE.starknetToken
    case KnownChainIds.CosmosMainnet:
    case KnownChainIds.BitcoinMainnet:
    case KnownChainIds.BitcoinCashMainnet:
    case KnownChainIds.DogecoinMainnet:
    case KnownChainIds.LitecoinMainnet:
    case KnownChainIds.ZcashMainnet:
    case KnownChainIds.ThorchainMainnet:
    case KnownChainIds.MayachainMainnet:
    case KnownChainIds.TonMainnet:
      throw Error(`Unhandled case '${chainId}'`)
    default:
      return assertUnreachable(chainId)
  }
}
