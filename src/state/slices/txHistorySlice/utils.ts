import { CAIP19 } from '@shapeshiftoss/caip'

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
