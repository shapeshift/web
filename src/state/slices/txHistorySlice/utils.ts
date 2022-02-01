import { CAIP19 } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import union from 'lodash/union'

import { Tx } from './txHistorySlice'

export const getRelatedAssetIds = (tx: Tx): CAIP19[] => {
  // we only want unique ids
  const relatedAssets = new Set<CAIP19>()
  // we want tokens to display on the fee asset
  if (tx.fee?.caip19) relatedAssets.add(tx.fee?.caip19)
  // all related transfers in a tx
  tx.transfers.forEach(transfer => relatedAssets.add(transfer.caip19))
  return Array.from(relatedAssets)
}

/**
 * Add a new item into an index
 *
 * @param parentIndex - The parent index holds ALL indexed values
 * @param childIndex - The child index holds SOME of the values in the parent index
 * @param newItem - The new item to add to the CHILD index
 */
export const addToIndex = <T>(parentIndex: T[], childIndex: T[], newItem: T): T[] =>
  intersection(parentIndex, union(childIndex, [newItem]))
