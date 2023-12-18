import type { AccountId, AssetId } from '@shapeshiftoss/caip'

import type { Tx } from './txHistorySlice'

type TxIndex = string
type TxDescriptor = {
  accountId: AccountId
  txid: Tx['txid']
  address: Tx['address']
  data?: Tx['data']
}

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
  accountId: TxDescriptor['accountId'],
  txid: TxDescriptor['txid'],
  address: TxDescriptor['address'],
  data?: TxDescriptor['data'],
): TxIndex => {
  // special case for thorchain transactions sent back in multiple parts
  if (data && data.parser === 'swap' && address.toLowerCase().startsWith('thor')) {
    return [accountId, txid, address.toLowerCase(), data.memo].join(UNIQUE_TX_ID_DELIMITER)
  }

  return [accountId, txid, address.toLowerCase()].join(UNIQUE_TX_ID_DELIMITER)
}

export const deserializeTxIndex = (txIndex: TxIndex): TxDescriptor => {
  // Split the serialized index back into its components
  const parts = txIndex.split(UNIQUE_TX_ID_DELIMITER)

  const result: TxDescriptor = {
    accountId: parts[0],
    txid: parts[1],
    address: parts[2],
  }

  // If there are four parts, the fourth is the data, and we know it's a thorchain transaction with a memo
  if (parts.length === 4) {
    result.data = {
      parser: 'swap',
      memo: parts[3],
    }
  }

  return result
}
