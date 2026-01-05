import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumAssetId,
  arbitrumChainId,
  arbitrumNovaAssetId,
  arbitrumNovaChainId,
  avalancheAssetId,
  avalancheChainId,
  baseAssetId,
  baseChainId,
  bchAssetId,
  bchChainId,
  bscAssetId,
  bscChainId,
  btcAssetId,
  btcChainId,
  cosmosAssetId,
  cosmosChainId,
  dogeAssetId,
  dogeChainId,
  ethAssetId,
  ethChainId,
  gnosisAssetId,
  gnosisChainId,
  hyperEvmAssetId,
  hyperEvmChainId,
  ltcAssetId,
  ltcChainId,
  mayachainAssetId,
  mayachainChainId,
  monadAssetId,
  monadChainId,
  nearAssetId,
  nearChainId,
  optimismAssetId,
  optimismChainId,
  plasmaAssetId,
  plasmaChainId,
  polygonAssetId,
  polygonChainId,
  solanaChainId,
  solAssetId,
  starknetAssetId,
  starknetChainId,
  suiAssetId,
  suiChainId,
  thorchainAssetId,
  thorchainChainId,
  tronAssetId,
  tronChainId,
  zecAssetId,
  zecChainId,
} from '@shapeshiftoss/caip'

export const NATIVE_ASSET_ID_BY_CHAIN_ID: Record<ChainId, AssetId> = {
  // EVM chains
  [ethChainId]: ethAssetId,
  [avalancheChainId]: avalancheAssetId,
  [optimismChainId]: optimismAssetId,
  [bscChainId]: bscAssetId,
  [polygonChainId]: polygonAssetId,
  [gnosisChainId]: gnosisAssetId,
  [arbitrumChainId]: arbitrumAssetId,
  [arbitrumNovaChainId]: arbitrumNovaAssetId,
  [baseChainId]: baseAssetId,
  [monadChainId]: monadAssetId,
  [hyperEvmChainId]: hyperEvmAssetId,
  [plasmaChainId]: plasmaAssetId,
  // UTXO chains
  [btcChainId]: btcAssetId,
  [bchChainId]: bchAssetId,
  [dogeChainId]: dogeAssetId,
  [ltcChainId]: ltcAssetId,
  [zecChainId]: zecAssetId,
  // Cosmos chains
  [cosmosChainId]: cosmosAssetId,
  [thorchainChainId]: thorchainAssetId,
  [mayachainChainId]: mayachainAssetId,
  // Other chains
  [solanaChainId]: solAssetId,
  [tronChainId]: tronAssetId,
  [suiChainId]: suiAssetId,
  [nearChainId]: nearAssetId,
  [starknetChainId]: starknetAssetId,
}

export function getNativeAssetId(chainId: ChainId): AssetId {
  const assetId = NATIVE_ASSET_ID_BY_CHAIN_ID[chainId]
  if (!assetId) {
    console.warn(`[Constants] Unknown chainId for native asset: ${chainId}`)
    return `${chainId}/slip44:60` as AssetId
  }
  return assetId
}
