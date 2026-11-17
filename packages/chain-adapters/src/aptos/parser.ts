import type {
  EntryFunctionPayloadResponse,
  PendingTransactionResponse,
  TransactionResponse,
  UserTransactionResponse,
} from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  getFunctionParts,
  isFeePayerSignature,
  isPendingTransactionResponse,
  isUserTransactionResponse,
} from '@aptos-labs/ts-sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

import type { Transaction, TxTransfer } from '../types'
import {
  APT_COIN_TYPE,
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

type BalanceChange = {
  // a coin type as the chain displays it, or a canonical fa metadata address
  assetType: string
  owner: string
  amount: bigint
}

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
    if (!('type' in change.data)) continue

    const { type, data } = change.data
    if (type !== OBJECT_CORE_RESOURCE_TYPE && type !== FUNGIBLE_STORE_RESOURCE_TYPE) continue

    const address = toCanonicalAddress(change.address)
    const store = stores.get(address) ?? {}

    if (type === OBJECT_CORE_RESOURCE_TYPE) {
      store.owner = toCanonicalAddress((data as { owner: string }).owner)
    } else {
      store.metadata = toCanonicalAddress((data as { metadata: { inner: string } }).metadata.inner)
    }

    stores.set(address, store)
  }

  // a store deleted in the transaction has no final resource write, so its deletion event names it
  for (const { type, data } of tx.events) {
    if (type !== FA_STORE_DELETION_EVENT_TYPE) continue

    const address = toCanonicalAddress(data.store)

    stores.set(address, {
      owner: toCanonicalAddress(data.owner),
      metadata: toCanonicalAddress(data.metadata),
      ...stores.get(address),
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

// swaps and other contract calls move funds through events rather than a transfer payload
const parseEventTransfers = async (
  tx: UserTransactionResponse,
  pubkey: string,
  resolveAssetId: AptosAssetIdResolver,
): Promise<TxTransfer[]> => {
  const owner = toCanonicalAddress(pubkey)
  const changes = getBalanceChanges(tx)
  const ownChanges = changes.filter(change => change.owner === owner)
  const isSender = addressesMatch(tx.sender, pubkey)
  const contract =
    'function' in tx.payload ? getFunctionParts(tx.payload.function).moduleAddress : undefined

  // framework calls and scripts move funds between accounts directly, so the other accounts are the counterparties
  const isDirect =
    isSender && (!contract || addressesMatch(contract, AccountAddress.ONE.toString()))

  const toResolve = isDirect ? changes : ownChanges
  const assetTypes = [...new Set(toResolve.map(({ assetType }) => assetType))]
  const assetIds = new Map(
    await Promise.all(
      assetTypes.map(async assetType => [assetType, await resolveAssetId(assetType)] as const),
    ),
  )

  // a coin and its paired fungible asset are one asset, so net after resolving
  const netByAssetId = new Map<AssetId, bigint>()
  for (const { assetType, amount } of ownChanges) {
    const assetId = assetIds.get(assetType)
    if (assetId) netByAssetId.set(assetId, (netByAssetId.get(assetId) ?? 0n) + amount)
  }

  // the accounts on the other side of the pubkey's net change in this asset
  const getCounterparties = (assetId: AssetId, amount: bigint): string[] => {
    if (!isSender) return [tx.sender]
    if (!isDirect && contract) return [contract]

    const others = changes
      .filter(change => change.owner !== owner && assetIds.get(change.assetType) === assetId)
      .filter(change => change.amount * amount < 0n)
      .map(change => change.owner)

    return others.length ? [...new Set(others)] : [contract ?? tx.sender]
  }

  return [...netByAssetId]
    .filter(([, amount]) => amount !== 0n)
    .map(([assetId, amount]) => {
      const isReceive = amount > 0n
      const counterparties = getCounterparties(assetId, amount)

      return {
        assetId,
        from: isReceive ? counterparties : [pubkey],
        to: isReceive ? [pubkey] : counterparties,
        type: isReceive ? TransferType.Receive : TransferType.Send,
        value: (isReceive ? amount : -amount).toString(),
      }
    })
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
