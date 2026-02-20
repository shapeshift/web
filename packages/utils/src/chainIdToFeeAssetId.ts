import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  avalancheAssetId,
  baseAssetId,
  bchAssetId,
  berachainAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  cronosAssetId,
  dogeAssetId,
  ethAssetId,
  gnosisAssetId,
  hyperEvmAssetId,
  inkAssetId,
  katanaAssetId,
  lineaAssetId,
  ltcAssetId,
  mantleAssetId,
  mayachainAssetId,
  megaethAssetId,
  monadAssetId,
  nearAssetId,
  optimismAssetId,
  plasmaAssetId,
  polygonAssetId,
  scrollAssetId,
  solAssetId,
  sonicAssetId,
  starknetAssetId,
  suiAssetId,
  thorchainAssetId,
  tonAssetId,
  tronAssetId,
  zecAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from './assertUnreachable'

export const chainIdToFeeAssetId = (_chainId: ChainId): AssetId => {
  const chainId = _chainId as KnownChainIds
  switch (chainId) {
    case KnownChainIds.ArbitrumMainnet:
      return arbitrumAssetId
    case KnownChainIds.AvalancheMainnet:
      return avalancheAssetId
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
    case KnownChainIds.MantleMainnet:
      return mantleAssetId
    case KnownChainIds.InkMainnet:
      return inkAssetId
    case KnownChainIds.MegaEthMainnet:
      return megaethAssetId
    case KnownChainIds.BerachainMainnet:
      return berachainAssetId
    case KnownChainIds.CronosMainnet:
      return cronosAssetId
    case KnownChainIds.KatanaMainnet:
      return katanaAssetId
    case KnownChainIds.LineaMainnet:
      return lineaAssetId
    case KnownChainIds.ScrollMainnet:
      return scrollAssetId
    case KnownChainIds.SonicMainnet:
      return sonicAssetId
    case KnownChainIds.ZcashMainnet:
      return zecAssetId
    case KnownChainIds.NearMainnet:
      return nearAssetId
    case KnownChainIds.TonMainnet:
      return tonAssetId
    default:
      return assertUnreachable(chainId)
  }
}
