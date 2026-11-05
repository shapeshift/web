import type { AssetId } from '@shapeshiftoss/caip'

export type ReconcileRelatedAssetGroupsArgs = {
  relatedAssetKeyByAssetId: Record<AssetId, AssetId | null | undefined>
  relatedAssetIndex: Record<AssetId, AssetId[]>
  // Asset ids by market cap, highest first
  rankedAssetIds: AssetId[]
  coinIdByAssetId: Record<AssetId, string>
  manualRelatedAssetIndex: Record<AssetId, AssetId[]>
  excludedAssetIds: AssetId[]
  nativeAssetIds: AssetId[]
  canonicalAssetIds: AssetId[]
}

export type ReconciledRelatedAssetGroups = {
  relatedAssetKeyByAssetId: Record<AssetId, AssetId | null>
  relatedAssetIndex: Record<AssetId, AssetId[]>
}

/**
 * Settles the groups the providers left behind:
 * - excluded assets leave groups they were wrongly put in
 * - every version of a CoinGecko coin shares one group, keyed by its native asset when it has one
 * - manual groups win over both
 */
export const reconcileRelatedAssetGroups = ({
  relatedAssetKeyByAssetId,
  relatedAssetIndex,
  rankedAssetIds,
  coinIdByAssetId,
  manualRelatedAssetIndex,
  excludedAssetIds,
  nativeAssetIds,
  canonicalAssetIds,
}: ReconcileRelatedAssetGroupsArgs): ReconciledRelatedAssetGroups => {
  const assetIds = Object.keys(relatedAssetKeyByAssetId)
  const isKnownAsset = (assetId: AssetId) => assetId in relatedAssetKeyByAssetId
  const rankByAssetId = new Map(rankedAssetIds.map((assetId, rank) => [assetId, rank]))
  const getRank = (assetId: AssetId) => rankByAssetId.get(assetId) ?? Number.MAX_SAFE_INTEGER
  const manualKeys = new Set(Object.keys(manualRelatedAssetIndex))
  const nativeAssetIdSet = new Set(nativeAssetIds)
  const canonicalAssetIdSet = new Set(canonicalAssetIds)

  // Lower sorts first: manual, then native, then canonical, then market cap
  const keyPriority = (assetId: AssetId): [number, number] => {
    if (manualKeys.has(assetId)) return [0, getRank(assetId)]
    if (nativeAssetIdSet.has(assetId)) return [1, getRank(assetId)]
    if (canonicalAssetIdSet.has(assetId)) return [2, getRank(assetId)]
    return [3, getRank(assetId)]
  }
  const pickKey = (candidates: AssetId[]): AssetId =>
    [...candidates].sort((a, b) => {
      const [aTier, aRank] = keyPriority(a)
      const [bTier, bRank] = keyPriority(b)
      return aTier - bTier || aRank - bRank
    })[0]

  const keyByAssetId = new Map<AssetId, AssetId>()
  for (const assetId of assetIds) {
    const key = relatedAssetKeyByAssetId[assetId]
    if (key && isKnownAsset(key)) keyByAssetId.set(assetId, key)
  }

  const membersOf = (key: AssetId) => assetIds.filter(assetId => keyByAssetId.get(assetId) === key)
  const rekey = (assetIdsToMove: AssetId[], key: AssetId) => {
    for (const assetId of assetIdsToMove) keyByAssetId.set(assetId, key)
  }

  for (const assetId of excludedAssetIds) keyByAssetId.delete(assetId)

  const chainIdOf = (assetId: AssetId) => assetId.slice(0, assetId.indexOf('/'))
  const nativeChainIdByCoinId = new Map<string, string>()
  for (const nativeAssetId of nativeAssetIds) {
    const coinId = coinIdByAssetId[nativeAssetId]
    if (coinId && isKnownAsset(nativeAssetId)) {
      nativeChainIdByCoinId.set(coinId, chainIdOf(nativeAssetId))
    }
  }

  const assetIdsByCoinId = new Map<string, AssetId[]>()
  for (const assetId of assetIds) {
    const coinId = coinIdByAssetId[assetId]
    if (!coinId) continue
    // A token on its native coin's own chain is the wrapped native, kept apart like WETH from ETH
    const isWrappedNative =
      !nativeAssetIdSet.has(assetId) && nativeChainIdByCoinId.get(coinId) === chainIdOf(assetId)
    if (isWrappedNative) continue
    assetIdsByCoinId.set(coinId, [...(assetIdsByCoinId.get(coinId) ?? []), assetId])
  }

  for (const [coinId, coinAssetIds] of assetIdsByCoinId) {
    // Groups keyed by another coin are left alone, e.g. a bridged token in its canonical's group
    const coinGroupKeys = new Set<AssetId>()
    const ungroupedAssetIds: AssetId[] = []
    for (const assetId of coinAssetIds) {
      const key = keyByAssetId.get(assetId)
      if (!key) ungroupedAssetIds.push(assetId)
      else if (coinIdByAssetId[key] === coinId) coinGroupKeys.add(key)
    }

    if (coinGroupKeys.size + ungroupedAssetIds.length < 2) continue

    const key = pickKey([...coinGroupKeys, ...ungroupedAssetIds])
    rekey([...[...coinGroupKeys].flatMap(membersOf), ...ungroupedAssetIds], key)
  }

  for (const [manualKey, manualAssetIds] of Object.entries(manualRelatedAssetIndex)) {
    const listedAssetIds = [manualKey, ...manualAssetIds].filter(isKnownAsset)
    if (listedAssetIds.length < 2) continue

    // A listed group key brings its group along, any other listed asset moves on its own
    const listedGroupKeys = listedAssetIds.filter(assetId => keyByAssetId.get(assetId) === assetId)
    rekey([...listedAssetIds, ...listedGroupKeys.flatMap(membersOf)], manualKey)
  }

  const membersByKey = new Map<AssetId, AssetId[]>()
  for (const [assetId, key] of keyByAssetId) {
    membersByKey.set(key, [...(membersByKey.get(key) ?? []), assetId])
  }

  const reconciledIndex: Record<AssetId, AssetId[]> = {}
  for (const [key, members] of membersByKey) {
    const memberSet = new Set([key, ...members])
    if (memberSet.size < 2) continue
    // Keep the existing order, so unchanged groups produce no diff
    const existingOrder = (relatedAssetIndex[key] ?? []).filter(assetId => memberSet.has(assetId))
    const added = [...memberSet]
      .filter(assetId => !existingOrder.includes(assetId))
      .sort((a, b) => getRank(a) - getRank(b))
    reconciledIndex[key] = [...existingOrder, ...added]
  }

  const reconciledKeys: Record<AssetId, AssetId | null> = {}
  for (const assetId of assetIds) reconciledKeys[assetId] = null
  for (const [key, members] of Object.entries(reconciledIndex)) {
    for (const assetId of members) reconciledKeys[assetId] = key
  }

  return { relatedAssetKeyByAssetId: reconciledKeys, relatedAssetIndex: reconciledIndex }
}
