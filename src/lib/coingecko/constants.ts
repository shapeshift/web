import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  adapters,
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

export const CHAIN_ID_TO_COINGECKO_PLATFORM_ID: Partial<
  Record<ChainId, adapters.CoingeckoAssetPlatform | null>
> = {
  [btcChainId]: null,
  [bchChainId]: null,
  [dogeChainId]: null,
  [ltcChainId]: null,
  [thorchainChainId]: null,
  [ethChainId]: adapters.CoingeckoAssetPlatform.Ethereum,
  [avalancheChainId]: adapters.CoingeckoAssetPlatform.Avalanche,
  [optimismChainId]: adapters.CoingeckoAssetPlatform.Optimism,
  [bscChainId]: adapters.CoingeckoAssetPlatform.BnbSmartChain,
  [polygonChainId]: adapters.CoingeckoAssetPlatform.Polygon,
  [gnosisChainId]: adapters.CoingeckoAssetPlatform.Gnosis,
  [arbitrumChainId]: adapters.CoingeckoAssetPlatform.Arbitrum,
  [arbitrumNovaChainId]: adapters.CoingeckoAssetPlatform.ArbitrumNova,
  [baseChainId]: adapters.CoingeckoAssetPlatform.Base,
  [cosmosChainId]: adapters.CoingeckoAssetPlatform.Cosmos,
}

export const COINGECKO_PLATFORM_ID_TO_CHAIN_ID: Partial<Record<string, ChainId | null>> = invert(
  CHAIN_ID_TO_COINGECKO_PLATFORM_ID,
)

export const COINGECKO_NATIVE_ASSET_ID_TO_ASSET_ID: Partial<Record<string, AssetId>> = {
  bitcoin: btcAssetId,
  'bitcoin-cash': bchAssetId,
  dogecoin: dogeAssetId,
  litecoin: ltcAssetId,
  [adapters.CoingeckoAssetPlatform.Ethereum]: ethAssetId,
  [adapters.CoingeckoAssetPlatform.Thorchain]: thorchainAssetId,
  [adapters.CoingeckoAssetPlatform.Gnosis]: gnosisAssetId,
  [adapters.CoingeckoAssetPlatform.Cosmos]: cosmosAssetId,
  // This isn't a mistake - the network and id are different in the case of MATIC/POS
  'polygon-ecosystem-token': polygonAssetId,
  [adapters.CoingeckoAssetPlatform.Base]: baseAssetId,
  // This isn't a mistake - the network and id are different in the case of BSC
  binanceCoin: bscAssetId,
}
