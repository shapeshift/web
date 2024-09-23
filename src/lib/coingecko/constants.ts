import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
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
  ltcAssetId,
  ltcChainId,
  optimismChainId,
  polygonAssetId,
  polygonChainId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'

export const CHAIN_ID_TO_COINGECKO_PLATFORM_ID: Partial<Record<ChainId, string | null>> = {
  // TODO(gomes): add another mapping to handle native assets without platform id
  [btcChainId]: null,
  [bchChainId]: null,
  [dogeChainId]: null,
  [ltcChainId]: null,
  [thorchainChainId]: null,
  [ethChainId]: 'ethereum',
  [avalancheChainId]: 'avalanche',
  [optimismChainId]: 'optimistic-ethereum',
  [bscChainId]: 'binance-smart-chain',
  [polygonChainId]: 'polygon-pos',
  [gnosisChainId]: 'xdai',
  [arbitrumChainId]: 'arbitrum-one',
  [arbitrumNovaChainId]: 'arbitrum-nova',
  [baseChainId]: 'base',
  [cosmosChainId]: 'cosmos',
}

export const COINGECKO_PLATFORM_ID_TO_CHAIN_ID: Partial<Record<string, ChainId | null>> = invert(
  CHAIN_ID_TO_COINGECKO_PLATFORM_ID,
)

export const COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID: Partial<Record<string, AssetId>> = {
  bitcoin: btcAssetId,
  'bitcoin-cash': bchAssetId,
  dogecoin: dogeAssetId,
  litecoin: ltcAssetId,
  ethereum: ethAssetId,
  thorchain: thorchainAssetId,
  xdai: gnosisAssetId,
  cosmos: cosmosAssetId,
  'matic-network': polygonAssetId,
  base: baseAssetId,
  binanceCoin: bscAssetId,
}
