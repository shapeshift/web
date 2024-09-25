import type { AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  baseAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  gnosisAssetId,
  ltcAssetId,
  polygonAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'

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
