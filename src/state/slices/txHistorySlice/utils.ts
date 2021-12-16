import { CAIP19 } from '@shapeshiftoss/caip'

import { Tx } from './txHistorySlice'

export const getRelatedAssetIds = (tx: Tx): CAIP19[] => {
  const relatedAssets = new Set<CAIP19>()
  if (tx.fee?.caip19) relatedAssets.add(tx.fee?.caip19)
  tx.transfers.forEach(transfer => relatedAssets.add(transfer.caip19))
  return Array.from(relatedAssets)
}
