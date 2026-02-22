import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  avalancheAssetId,
  baseAssetId,
  bchAssetId,
  blastAssetId,
  berachainAssetId,
  bobAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  cronosAssetId,
  dogeAssetId,
  ethAssetId,
  gnosisAssetId,
  hemiAssetId,
  hyperEvmAssetId,
  inkAssetId,
  katanaAssetId,
  lineaAssetId,
  ltcAssetId,
  mantleAssetId,
  mayachainAssetId,
  megaethAssetId,
  modeAssetId,
  monadAssetId,
  nearAssetId,
  optimismAssetId,
  plasmaAssetId,
  plumeAssetId,
  polygonAssetId,
  scrollAssetId,
  solAssetId,
  soneiumAssetId,
  sonicAssetId,
  starknetAssetId,
  storyAssetId,
  suiAssetId,
  thorchainAssetId,
  tonAssetId,
  tronAssetId,
  worldChainAssetId,
  unichainAssetId,
  zecAssetId,
  zkSyncEraAssetId,
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
    case KnownChainIds.PlumeMainnet:
      return plumeAssetId
    case KnownChainIds.StoryMainnet:
      return storyAssetId
    case KnownChainIds.ZkSyncEraMainnet:
      return zkSyncEraAssetId
    case KnownChainIds.BlastMainnet:
      return blastAssetId
    case KnownChainIds.WorldChainMainnet:
      return worldChainAssetId
    case KnownChainIds.HemiMainnet:
      return hemiAssetId
    case KnownChainIds.LineaMainnet:
      return lineaAssetId
    case KnownChainIds.ScrollMainnet:
      return scrollAssetId
    case KnownChainIds.SonicMainnet:
      return sonicAssetId
    case KnownChainIds.UnichainMainnet:
      return unichainAssetId
    case KnownChainIds.BobMainnet:
      return bobAssetId
    case KnownChainIds.ModeMainnet:
      return modeAssetId
    case KnownChainIds.SoneiumMainnet:
      return soneiumAssetId
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
