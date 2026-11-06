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

  // Lower sorts first, canonical ahead of native so a chain paying gas in a bridged stablecoin can't lead its family
  const keyPriority = (assetId: AssetId): [number, number] => {
    if (manualKeys.has(assetId)) return [0, getRank(assetId)]
    if (canonicalAssetIdSet.has(assetId)) return [1, getRank(assetId)]
    if (nativeAssetIdSet.has(assetId)) return [2, getRank(assetId)]
    return [3, getRank(assetId)]
  }
  const pickKey = (candidates: AssetId[]): AssetId =>
    [...candidates].sort((a, b) => {
      const [aTier, aRank] = keyPriority(a)
      const [bTier, bRank] = keyPriority(b)
      return aTier - bTier || aRank - bRank
    })[0]

  const keyByAssetId = new Map<AssetId, AssetId>()
  const membersByKey = new Map<AssetId, Set<AssetId>>()
  const clearKey = (assetId: AssetId) => {
    const key = keyByAssetId.get(assetId)
    if (key) membersByKey.get(key)?.delete(assetId)
    keyByAssetId.delete(assetId)
  }
  const rekey = (assetIdsToMove: AssetId[], key: AssetId) => {
    for (const assetId of assetIdsToMove) {
      clearKey(assetId)
      keyByAssetId.set(assetId, key)
      membersByKey.set(key, (membersByKey.get(key) ?? new Set<AssetId>()).add(assetId))
    }
  }
  const membersOf = (key: AssetId) => [...(membersByKey.get(key) ?? [])]
  // An asset leaving a group it leads hands that group to the best remaining member
  const leaveGroup = (assetId: AssetId) => {
    const remainingMembers = membersOf(assetId).filter(member => member !== assetId)
    clearKey(assetId)
    if (remainingMembers.length) rekey(remainingMembers, pickKey(remainingMembers))
  }

  for (const assetId of assetIds) {
    const key = relatedAssetKeyByAssetId[assetId]
    if (key && isKnownAsset(key)) rekey([assetId], key)
  }

  for (const assetId of excludedAssetIds) leaveGroup(assetId)

  const chainIdOf = (assetId: AssetId) => assetId.slice(0, assetId.indexOf('/'))
  const nativeChainIdsByCoinId = new Map<string, Set<string>>()
  for (const nativeAssetId of nativeAssetIds) {
    const coinId = coinIdByAssetId[nativeAssetId]
    if (!coinId || !isKnownAsset(nativeAssetId)) continue
    const chainIds = nativeChainIdsByCoinId.get(coinId) ?? new Set<string>()
    nativeChainIdsByCoinId.set(coinId, chainIds.add(chainIdOf(nativeAssetId)))
  }

  const assetIdsByCoinId = new Map<string, AssetId[]>()
  for (const assetId of assetIds) {
    const coinId = coinIdByAssetId[assetId]
    if (!coinId) continue
    // A token on its native coin's own chain is the wrapped native, kept apart like WETH from ETH
    const isWrappedNative =
      !nativeAssetIdSet.has(assetId) &&
      Boolean(nativeChainIdsByCoinId.get(coinId)?.has(chainIdOf(assetId)))
    if (isWrappedNative) {
      const key = keyByAssetId.get(assetId)
      if (key && coinIdByAssetId[key] === coinId) leaveGroup(assetId)
      continue
    }
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

    const candidates = coinAssetIds.filter(assetId => {
      const key = keyByAssetId.get(assetId)
      return !key || coinGroupKeys.has(key)
    })
    const key = pickKey(candidates)
    const [onlyGroupKey] = coinGroupKeys
    // A lone group stays as is unless its native coin should lead it
    const isSettled =
      coinGroupKeys.size + ungroupedAssetIds.length < 2 &&
      (!nativeAssetIdSet.has(key) || onlyGroupKey === key)
    if (candidates.length < 2 || isSettled) continue

    rekey([...[...coinGroupKeys].flatMap(membersOf), ...ungroupedAssetIds], key)
  }

  for (const [manualKey, manualAssetIds] of Object.entries(manualRelatedAssetIndex)) {
    if (!isKnownAsset(manualKey)) continue
    const listedAssetIds = [manualKey, ...manualAssetIds].filter(isKnownAsset)
    if (listedAssetIds.length < 2) continue

    // A listed group key brings its group along, any other listed asset moves on its own
    const listedGroupKeys = listedAssetIds.filter(assetId => keyByAssetId.get(assetId) === assetId)
    rekey([...listedAssetIds, ...listedGroupKeys.flatMap(membersOf)], manualKey)
  }

  // A key that itself points elsewhere hands its members to where it points, so no asset sits in two groups
  const resolveKey = (key: AssetId, visited: Set<AssetId>): AssetId => {
    const nextKey = keyByAssetId.get(key)
    if (!nextKey || nextKey === key || visited.has(nextKey)) return key
    return resolveKey(nextKey, visited.add(key))
  }
  const resolvedMembersByKey = new Map<AssetId, AssetId[]>()
  for (const [assetId, key] of keyByAssetId) {
    const resolvedKey = resolveKey(key, new Set([assetId]))
    resolvedMembersByKey.set(resolvedKey, [
      ...(resolvedMembersByKey.get(resolvedKey) ?? []),
      assetId,
    ])
  }

  const reconciledIndex: Record<AssetId, AssetId[]> = {}
  for (const [key, members] of resolvedMembersByKey) {
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
