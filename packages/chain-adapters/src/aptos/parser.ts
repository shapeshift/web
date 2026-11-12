import type {
  EntryFunctionPayloadResponse,
  PendingTransactionResponse,
  TransactionResponse,
  UserTransactionResponse,
} from '@aptos-labs/ts-sdk'
import {
  isFeePayerSignature,
  isPendingTransactionResponse,
  isUserTransactionResponse,
} from '@aptos-labs/ts-sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

import type { Transaction, TxTransfer } from '../types'
import {
  APT_COIN_TYPE,
  APT_FA_METADATA,
  COIN_DEPOSIT_EVENT_TYPE,
  COIN_TRANSFER_FUNCTIONS,
  COIN_WITHDRAW_EVENT_TYPE,
  FA_DEPOSIT_EVENT_TYPE,
  FA_TRANSFER_FUNCTIONS,
  FA_WITHDRAW_EVENT_TYPE,
  FUNGIBLE_STORE_RESOURCE_TYPE,
  OBJECT_CORE_RESOURCE_TYPE,
} from './constants'
import { addressesMatch, toCanonicalAddress, toCanonicalAssetType } from './utils'

type ParsedTransfer = { assetType: string; recipient: string; amount: string }

// resolves a fungible asset metadata address or coin type to its assetId
export type AptosAssetIdResolver = (assetType: string) => Promise<AssetId>

type StoreResource =
  | { type: typeof OBJECT_CORE_RESOURCE_TYPE; data: { owner: string } }
  | { type: typeof FUNGIBLE_STORE_RESOURCE_TYPE; data: { metadata: { inner: string } } }
  | { type: string; data: unknown }

const parseTransferPayload = (
  payload: EntryFunctionPayloadResponse,
): ParsedTransfer | undefined => {
  const { function: fn, type_arguments: typeArgs, arguments: args } = payload

  if (COIN_TRANSFER_FUNCTIONS.includes(fn)) {
    // aptos_account::transfer has no type argument and only moves apt
    return {
      assetType: typeArgs[0] ?? APT_COIN_TYPE,
      recipient: String(args[0] ?? ''),
      amount: String(args[1] ?? '0'),
    }
  }

  if (FA_TRANSFER_FUNCTIONS.includes(fn)) {
    const metadata = args[0]
    const reference = typeof metadata === 'string' ? metadata : metadata?.inner
    if (!reference) return

    return {
      assetType: toCanonicalAssetType(reference),
      recipient: String(args[1] ?? ''),
      amount: String(args[2] ?? '0'),
    }
  }
}

const getStores = (tx: UserTransactionResponse) => {
  const stores = new Map<string, { owner?: string; metadata?: string }>()

  // object resource groups are written whole, so a store's owner and metadata come with any balance change
  for (const change of tx.changes) {
    if (change.type !== 'write_resource' || !('address' in change) || !('data' in change)) continue

    const address = toCanonicalAddress(change.address)
    const resource = change.data as StoreResource
    const store = stores.get(address) ?? {}

    if (resource.type === OBJECT_CORE_RESOURCE_TYPE) {
      store.owner = (resource.data as { owner: string }).owner
    } else if (resource.type === FUNGIBLE_STORE_RESOURCE_TYPE) {
      store.metadata = toCanonicalAddress(
        (resource.data as { metadata: { inner: string } }).metadata.inner,
      )
    } else {
      continue
    }

    stores.set(address, store)
  }

  return stores
}

// net amount moved in (positive) or out (negative) of the pubkey's balances, keyed by fa metadata or coin type
export const getAptosBalanceChanges = (
  tx: UserTransactionResponse,
  pubkey: string,
): Map<string, bigint> => {
  const stores = getStores(tx)
  const changes = new Map<string, bigint>()

  const add = (assetType: string, amount: bigint) =>
    changes.set(assetType, (changes.get(assetType) ?? 0n) + amount)

  for (const { type, data } of tx.events) {
    const sign =
      type === FA_DEPOSIT_EVENT_TYPE || type === COIN_DEPOSIT_EVENT_TYPE
        ? 1n
        : type === FA_WITHDRAW_EVENT_TYPE || type === COIN_WITHDRAW_EVENT_TYPE
        ? -1n
        : 0n

    if (!sign) continue

    if (type === COIN_DEPOSIT_EVENT_TYPE || type === COIN_WITHDRAW_EVENT_TYPE) {
      if (addressesMatch(data.account, pubkey)) {
        add(toCanonicalAssetType(data.coin_type), sign * BigInt(data.amount))
      }
      continue
    }

    const store = stores.get(toCanonicalAddress(data.store))
    if (!store?.metadata || !store.owner || !addressesMatch(store.owner, pubkey)) continue

    add(store.metadata, sign * BigInt(data.amount))
  }

  return changes
}

export const isAptosNativeAssetType = (assetType: string): boolean =>
  assetType === APT_COIN_TYPE || addressesMatch(assetType, APT_FA_METADATA)

// swaps and other contract calls move funds through events rather than a transfer payload
const parseEventTransfers = async (
  tx: UserTransactionResponse,
  pubkey: string,
  resolveAssetId: AptosAssetIdResolver,
): Promise<TxTransfer[]> => {
  // a coin and its paired fungible asset are one asset, so net after resolving
  const netByAssetId = new Map<AssetId, bigint>()
  for (const [assetType, amount] of getAptosBalanceChanges(tx, pubkey)) {
    const assetId = await resolveAssetId(assetType)
    netByAssetId.set(assetId, (netByAssetId.get(assetId) ?? 0n) + amount)
  }

  const contract = 'function' in tx.payload ? tx.payload.function.split('::')[0] : tx.sender
  const counterparty = addressesMatch(tx.sender, pubkey) ? contract : tx.sender

  return [...netByAssetId]
    .filter(([, amount]) => amount !== 0n)
    .map(([assetId, amount]) =>
      amount > 0n
        ? {
            assetId,
            from: [counterparty],
            to: [pubkey],
            type: TransferType.Receive,
            value: amount.toString(),
          }
        : {
            assetId,
            from: [pubkey],
            to: [counterparty],
            type: TransferType.Send,
            value: (-amount).toString(),
          },
    )
}

// sponsored transactions are paid by the fee payer rather than the sender
const getFeePayer = (tx: UserTransactionResponse): string =>
  tx.signature && isFeePayerSignature(tx.signature) ? tx.signature.fee_payer_address : tx.sender

export const getAptosTxStatus = (tx: TransactionResponse): TxStatus => {
  if (isPendingTransactionResponse(tx)) return TxStatus.Pending
  if (!isUserTransactionResponse(tx)) return TxStatus.Unknown

  return tx.success ? TxStatus.Confirmed : TxStatus.Failed
}

export const parseAptosTx = async (
  tx: UserTransactionResponse | PendingTransactionResponse,
  pubkey: string,
  chainId: ChainId,
  assetId: AssetId,
  resolveAssetId: AptosAssetIdResolver,
): Promise<Transaction> => {
  const isUserTx = isUserTransactionResponse(tx)
  const status = getAptosTxStatus(tx)

  const transfers: TxTransfer[] = []
  const transfer = 'function' in tx.payload ? parseTransferPayload(tx.payload) : undefined

  if (transfer) {
    const { sender } = tx
    const { recipient, amount: value } = transfer
    const base = {
      assetId: await resolveAssetId(transfer.assetType),
      from: [sender],
      to: [recipient],
      value,
    }

    if (addressesMatch(sender, pubkey)) transfers.push({ ...base, type: TransferType.Send })
    if (addressesMatch(recipient, pubkey)) transfers.push({ ...base, type: TransferType.Receive })
  } else if (isUserTx && tx.success) {
    transfers.push(...(await parseEventTransfers(tx, pubkey, resolveAssetId)))
  }

  return {
    txid: tx.hash,
    blockHeight: isUserTx ? Number(tx.version) : 0,
    // aptos timestamps are in microseconds
    blockTime: isUserTx ? Math.floor(Number(tx.timestamp) / 1_000_000) : 0,
    blockHash: undefined,
    chainId,
    confirmations: status === TxStatus.Confirmed ? 1 : 0,
    status,
    fee:
      isUserTx && addressesMatch(getFeePayer(tx), pubkey)
        ? { assetId, value: (BigInt(tx.gas_used) * BigInt(tx.gas_unit_price)).toString() }
        : undefined,
    transfers,
    pubkey,
  }
}
