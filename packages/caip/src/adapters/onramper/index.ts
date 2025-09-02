import entries from 'lodash/entries'

import type { AssetId } from '../../assetId/assetId'
import {
  arbitrumAssetId,
  avalancheAssetId,
  baseAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  gnosisAssetId,
  ltcAssetId,
  optimismAssetId,
  polygonAssetId,
  solAssetId,
  thorchainAssetId,
} from '../../constants'

type OnRamperTokenId = string

// Native assets only - tokens are fetched dynamically
export const NativeAssetIdToOnRamperIdMap: Record<AssetId, OnRamperTokenId[]> = {
  [bscAssetId]: ['bnb_bsc'],
  [dogeAssetId]: ['doge_dogecoin'],
  [ethAssetId]: ['eth'],
  [arbitrumAssetId]: ['eth_arbitrum'],
  [optimismAssetId]: ['eth_optimism'],
  [baseAssetId]: ['eth_base'],
  [ltcAssetId]: ['ltc_litecoin'],
  [polygonAssetId]: ['matic_polygon'],
  [thorchainAssetId]: ['rune_thorchain'],
  [avalancheAssetId]: ['avax_avaxc'],
  [btcAssetId]: ['btc'],
  [bchAssetId]: ['bch_bitcoincash'],
  [cosmosAssetId]: ['atom_cosmos'],
  [gnosisAssetId]: ['xdai_gnosis'],
  [solAssetId]: ['sol'],
}

// explodes and inverts the assetId => tokenId[] map by creating a 1to1 token => assetId mapping
const invertMap = () => {
  const invertedMap: Record<OnRamperTokenId, AssetId> = {}
  entries(NativeAssetIdToOnRamperIdMap).flatMap(([assetId, idList]) =>
    idList.forEach(id => {
      invertedMap[id] = assetId
    }),
  )
  return invertedMap
}

const OnRamperIdToAssetIdMap = invertMap()

export const onRamperTokenIdToAssetId = (tokenId: OnRamperTokenId): AssetId | undefined =>
  OnRamperIdToAssetIdMap[tokenId]

export const assetIdToOnRamperTokenList = (assetId: AssetId): OnRamperTokenId[] | undefined =>
  NativeAssetIdToOnRamperIdMap[assetId]
