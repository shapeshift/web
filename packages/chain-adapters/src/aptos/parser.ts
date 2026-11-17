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
  FA_STORE_DELETION_EVENT_TYPE,
  FA_TRANSFER_FUNCTIONS,
  FA_WITHDRAW_EVENT_TYPE,
  FUNGIBLE_STORE_RESOURCE_TYPE,
  OBJECT_CORE_RESOURCE_TYPE,
} from './constants'
import { addressesMatch, toCanonicalAddress } from './utils'

type ParsedTransfer = { assetType: string; recipient: string; amount: string }

export type AptosAssetIdResolver = (assetType: string) => Promise<AssetId>

// keyed by fa metadata address in long form, or by coin type as the chain displays it
type BalanceChange = { assetType: string; owner: string; amount: bigint }

const FRAMEWORK_ADDRESS = '0x1'

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
      assetType: toCanonicalAddress(reference),
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
    const { type, data } = change.data
    const store = stores.get(address) ?? {}

    if (type === OBJECT_CORE_RESOURCE_TYPE) {
      store.owner = toCanonicalAddress((data as { owner: string }).owner)
    } else if (type === FUNGIBLE_STORE_RESOURCE_TYPE) {
      store.metadata = toCanonicalAddress((data as { metadata: { inner: string } }).metadata.inner)
    } else {
      continue
    }

    stores.set(address, store)
  }

  // a store deleted in the transaction has no final resource write, so its deletion event names it
  for (const { type, data } of tx.events) {
    if (type !== FA_STORE_DELETION_EVENT_TYPE) continue

    const address = toCanonicalAddress(data.store)
    const store = stores.get(address)

    stores.set(address, {
      owner: store?.owner ?? toCanonicalAddress(data.owner),
      metadata: store?.metadata ?? toCanonicalAddress(data.metadata),
    })
  }

  return stores
}

const getBalanceChanges = (tx: UserTransactionResponse): BalanceChange[] => {
  const stores = getStores(tx)

  return tx.events.flatMap(({ type, data }): BalanceChange[] => {
    switch (type) {
      case COIN_DEPOSIT_EVENT_TYPE:
      case COIN_WITHDRAW_EVENT_TYPE: {
        const sign = type === COIN_DEPOSIT_EVENT_TYPE ? 1n : -1n
        return [
          {
            assetType: data.coin_type,
            owner: toCanonicalAddress(data.account),
            amount: sign * BigInt(data.amount),
          },
        ]
      }
      case FA_DEPOSIT_EVENT_TYPE:
      case FA_WITHDRAW_EVENT_TYPE: {
        const store = stores.get(toCanonicalAddress(data.store))
        if (!store?.metadata || !store.owner) return []

        const sign = type === FA_DEPOSIT_EVENT_TYPE ? 1n : -1n
        return [
          { assetType: store.metadata, owner: store.owner, amount: sign * BigInt(data.amount) },
        ]
      }
      default:
        return []
    }
  })
}

export const isAptosNativeAssetType = (assetType: string): boolean =>
  assetType === APT_COIN_TYPE || addressesMatch(assetType, APT_FA_METADATA)

const getCounterparties = (
  tx: UserTransactionResponse,
  pubkey: string,
  changes: BalanceChange[],
): string[] => {
  if (!addressesMatch(tx.sender, pubkey)) return [tx.sender]

  const contract = 'function' in tx.payload ? tx.payload.function.split('::')[0] : undefined
  if (contract && !addressesMatch(contract, FRAMEWORK_ADDRESS)) return [contract]

  // framework calls and scripts move funds between accounts directly, so name the other accounts
  const others = [
    ...new Set(changes.map(({ owner }) => owner).filter(owner => !addressesMatch(owner, pubkey))),
  ]

  return others.length ? others : [contract ?? tx.sender]
}

// swaps and other contract calls move funds through events rather than a transfer payload
const parseEventTransfers = async (
  tx: UserTransactionResponse,
  pubkey: string,
  resolveAssetId: AptosAssetIdResolver,
): Promise<TxTransfer[]> => {
  const changes = getBalanceChanges(tx)
  const ownChanges = changes.filter(({ owner }) => addressesMatch(owner, pubkey))

  const assetTypes = [...new Set(ownChanges.map(({ assetType }) => assetType))]
  const assetIds = new Map(
    await Promise.all(
      assetTypes.map(async assetType => [assetType, await resolveAssetId(assetType)] as const),
    ),
  )

  // a coin and its paired fungible asset are one asset, so net after resolving
  const netByAssetId = new Map<AssetId, bigint>()
  for (const { assetType, amount } of ownChanges) {
    const assetId = assetIds.get(assetType)
    if (!assetId) continue
    netByAssetId.set(assetId, (netByAssetId.get(assetId) ?? 0n) + amount)
  }

  const counterparties = getCounterparties(tx, pubkey, changes)

  return [...netByAssetId]
    .filter(([, amount]) => amount !== 0n)
    .map(([assetId, amount]) =>
      amount > 0n
        ? {
            assetId,
            from: counterparties,
            to: [pubkey],
            type: TransferType.Receive,
            value: amount.toString(),
          }
        : {
            assetId,
            from: [pubkey],
            to: counterparties,
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
