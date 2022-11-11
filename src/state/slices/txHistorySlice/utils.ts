import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import union from 'lodash/union'

import type { Tx } from './txHistorySlice'

type TxIndex = string

export const getRelatedAssetIds = (tx: Tx): AssetId[] => {
  // we only want unique ids
  const relatedAssets = new Set<AssetId>()
  // we want tokens to display on the fee asset
  if (tx.fee?.assetId) relatedAssets.add(tx.fee?.assetId)
  // all related transfers in a tx
  tx.transfers.forEach(transfer => relatedAssets.add(transfer.assetId))
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

/**
 * now we support accounts, we have a new problem
 * the same tx id can have multiple representations, depending on the
 * account's perspective, especially utxos.
 *
 * i.e. a bitcoin send will have a send component, and a receive component for
 * the change, to a new address, but the same tx id.
 * this means we can't uniquely index tx's simply by their id.
 *
 * we'll probably need to go back to some composite index that can be built from
 * the txid and address, or account id, that can be deterministically generated,
 * from the tx data and the account id - note, not the address.
 *
 * the correct solution is to not rely on the parsed representation of the tx
 * as a "send" or "receive" from chain adapters, just index the tx related to the
 * asset or account, and parse the tx closer to the view layer.
 */

// we can't use a hyphen as a delimiter, as it appears in the chain reference for cosmos
export const UNIQUE_TX_ID_DELIMITER = '*'
export const serializeTxIndex = (
  accountId: AccountId,
  txid: Tx['txid'],
  address: Tx['address'],
  data?: Tx['data'],
): TxIndex => {
  // special case for thorchain transactions sent back in multiple parts
  if (data && data.parser === 'swap') {
    return [accountId, txid, address.toLowerCase(), data.memo].join(UNIQUE_TX_ID_DELIMITER)
  }

  return [accountId, txid, address.toLowerCase()].join(UNIQUE_TX_ID_DELIMITER)
}

/**
 * index insanity
 * 1:n wallet:accountids
 * 1:n accountid:txids
 */

/**
 * change address problem - chain adapters has necessary and sufficient information to compose these together - may have to get into parser too
 * accountType - a relic that can die
 * memo can go away too as it's account specific so we won't stomp on other txs
 *
 */
