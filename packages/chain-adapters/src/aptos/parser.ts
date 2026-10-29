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
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

import type { Transaction, TxTransfer } from '../types'
import { APT_COIN_TYPE, COIN_TRANSFER_FUNCTIONS, FA_TRANSFER_FUNCTIONS } from './constants'
import { addressesMatch } from './utils'

type ParsedTransfer = { assetId: AssetId; recipient: string; amount: string }

const parseTransferPayload = (
  payload: EntryFunctionPayloadResponse,
  chainId: ChainId,
  assetId: AssetId,
): ParsedTransfer | undefined => {
  const { function: fn, type_arguments: typeArgs, arguments: args } = payload

  if (COIN_TRANSFER_FUNCTIONS.includes(fn)) {
    // aptos_account::transfer has no type argument and only moves apt
    const coinType = typeArgs[0] ?? APT_COIN_TYPE

    return {
      assetId:
        coinType === APT_COIN_TYPE
          ? assetId
          : toAssetId({
              chainId,
              assetNamespace: ASSET_NAMESPACE.aptosCoin,
              assetReference: coinType,
            }),
      recipient: String(args[0] ?? ''),
      amount: String(args[1] ?? '0'),
    }
  }

  if (FA_TRANSFER_FUNCTIONS.includes(fn)) {
    const metadata = args[0]
    const reference = typeof metadata === 'string' ? metadata : metadata?.inner
    if (!reference) return

    return {
      assetId: toAssetId({
        chainId,
        assetNamespace: ASSET_NAMESPACE.aptosFungible,
        assetReference: reference,
      }),
      recipient: String(args[1] ?? ''),
      amount: String(args[2] ?? '0'),
    }
  }
}

// sponsored transactions are paid by the fee payer rather than the sender
const getFeePayer = (tx: UserTransactionResponse): string =>
  tx.signature && isFeePayerSignature(tx.signature) ? tx.signature.fee_payer_address : tx.sender

export const getAptosTxStatus = (tx: TransactionResponse): TxStatus => {
  if (isPendingTransactionResponse(tx)) return TxStatus.Pending
  if (!isUserTransactionResponse(tx)) return TxStatus.Unknown

  return tx.success ? TxStatus.Confirmed : TxStatus.Failed
}

export const parseAptosTx = (
  tx: UserTransactionResponse | PendingTransactionResponse,
  pubkey: string,
  chainId: ChainId,
  assetId: AssetId,
): Transaction => {
  const isUserTx = isUserTransactionResponse(tx)
  const status = getAptosTxStatus(tx)

  const transfers: TxTransfer[] = []
  const transfer =
    'function' in tx.payload ? parseTransferPayload(tx.payload, chainId, assetId) : undefined

  if (transfer) {
    const { sender } = tx
    const { recipient, amount: value } = transfer
    const base = { assetId: transfer.assetId, from: [sender], to: [recipient], value }

    if (addressesMatch(sender, pubkey)) transfers.push({ ...base, type: TransferType.Send })
    if (addressesMatch(recipient, pubkey)) transfers.push({ ...base, type: TransferType.Receive })
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
