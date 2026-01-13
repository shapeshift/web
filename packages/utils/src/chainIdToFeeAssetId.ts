import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  arbitrumNovaAssetId,
  ASSET_NAMESPACE,
  avalancheAssetId,
  baseAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  gnosisAssetId,
  hyperEvmAssetId,
  katanaAssetId,
  ltcAssetId,
  mayachainAssetId,
  monadAssetId,
  nearAssetId,
  optimismAssetId,
  plasmaAssetId,
  polygonAssetId,
  solAssetId,
  starknetAssetId,
  suiAssetId,
  thorchainAssetId,
  toAssetId,
  tronAssetId,
  zecAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

export const chainIdToFeeAssetId = (_chainId: ChainId): AssetId => {
  const chainId = _chainId as KnownChainIds
  switch (chainId) {
    case KnownChainIds.ArbitrumMainnet:
      return arbitrumAssetId
    case KnownChainIds.AvalancheMainnet:
      return avalancheAssetId
    case KnownChainIds.ArbitrumNovaMainnet:
      return arbitrumNovaAssetId
    case KnownChainIds.BaseMainnet:
      return baseAssetId
    case KnownChainIds.BitcoinCashMainnet:
      return bchAssetId
    case KnownChainIds.BitcoinMainnet:
      return btcAssetId
    case KnownChainIds.BnbSmartChainMainnet:
      return bscAssetId
    case KnownChainIds.CosmosMainnet:
      return cosmosAssetId
    case KnownChainIds.DogecoinMainnet:
      return dogeAssetId
    case KnownChainIds.EthereumMainnet:
      return ethAssetId
    case KnownChainIds.GnosisMainnet:
      return gnosisAssetId
    case KnownChainIds.LitecoinMainnet:
      return ltcAssetId
    case KnownChainIds.OptimismMainnet:
      return optimismAssetId
    case KnownChainIds.PolygonMainnet:
      return polygonAssetId
    case KnownChainIds.ThorchainMainnet:
      return thorchainAssetId
    case KnownChainIds.MayachainMainnet:
      return mayachainAssetId
    case KnownChainIds.SolanaMainnet:
      return solAssetId
    case KnownChainIds.TronMainnet:
      return tronAssetId
    case KnownChainIds.SuiMainnet:
      return suiAssetId
    case KnownChainIds.StarknetMainnet:
      return starknetAssetId
    case KnownChainIds.MonadMainnet:
      return monadAssetId
    case KnownChainIds.HyperEvmMainnet:
      return hyperEvmAssetId
    case KnownChainIds.PlasmaMainnet:
      return plasmaAssetId
    case KnownChainIds.KatanaMainnet:
      return katanaAssetId
    case KnownChainIds.ZcashMainnet:
      return zecAssetId
    case KnownChainIds.NearMainnet:
      return nearAssetId
    default:
      if (_chainId.startsWith('eip155:')) {
        return toAssetId({
          chainId: _chainId,
          assetNamespace: ASSET_NAMESPACE.slip44,
          assetReference: '60',
        })
      }
      throw new Error(`chainIdToFeeAssetId: unsupported chainId ${_chainId}`)
  }
}
