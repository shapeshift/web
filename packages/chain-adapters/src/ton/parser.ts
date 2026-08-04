import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

import type { Transaction, TxTransfer } from '../types'
import type { JettonTransferRecord, TonTx } from './types'
import { addressesMatch, isProxyTon, resolveAddresses } from './utils'

export const buildJettonTransfers = (
  jettonTransfers: JettonTransferRecord[],
  traceId: string,
  pubkey: string,
  addressBook: Record<string, { user_friendly: string }>,
  chainId: ChainId,
): TxTransfer[] => {
  const transfers: TxTransfer[] = []

  const matching = jettonTransfers.filter(jt => jt.trace_id === traceId)
  if (matching.length === 0) return transfers

  const friendly = (addr: string) => addressBook[addr]?.user_friendly ?? addr

  for (const transfer of matching) {
    if (!transfer.source || !transfer.destination || !transfer.amount || !transfer.jetton_master)
      continue

    const sourceUserFriendly = friendly(transfer.source)
    const destUserFriendly = friendly(transfer.destination)
    const jettonUserFriendly = friendly(transfer.jetton_master)

    if (isProxyTon(jettonUserFriendly)) continue

    const isSend = addressesMatch(sourceUserFriendly, pubkey)
    const isReceive = addressesMatch(destUserFriendly, pubkey)

    if (!isSend && !isReceive) continue

    const assetId = toAssetId({
      chainId,
      assetNamespace: 'jetton',
      assetReference: jettonUserFriendly,
    })

    if (isSend) {
      transfers.push({
        assetId,
        from: [sourceUserFriendly],
        to: [destUserFriendly],
        type: TransferType.Send,
        value: transfer.amount,
      })
    }

    if (isReceive) {
      transfers.push({
        assetId,
        from: [sourceUserFriendly],
        to: [destUserFriendly],
        type: TransferType.Receive,
        value: transfer.amount,
      })
    }
  }

  return transfers
}

export const parseTonTx = (
  tx: TonTx,
  pubkey: string,
  txid: string,
  assetId: AssetId,
  chainId: ChainId,
): Transaction => {
  const isAborted = tx.description?.aborted ?? false
  const actionSuccess = tx.description?.action?.success ?? true
  const status = isAborted || !actionSuccess ? TxStatus.Failed : TxStatus.Confirmed

  const transfers: TxTransfer[] = []

  if (tx.in_msg?.value && tx.in_msg.source && tx.in_msg.destination) {
    const inMsgDecodedType = tx.in_msg.message_content?.decoded?.['@type']
    const isExcess = inMsgDecodedType === 'excess'
    const value = tx.in_msg.value
    if (BigInt(value) > 0n && !isExcess) {
      const isReceive = addressesMatch(tx.in_msg.destination, pubkey)
      const isSend = addressesMatch(tx.in_msg.source, pubkey)

      if (isSend) {
        transfers.push({
          assetId,
          from: [tx.in_msg.source],
          to: [tx.in_msg.destination],
          type: TransferType.Send,
          value,
        })
      }
      if (isReceive) {
        transfers.push({
          assetId,
          from: [tx.in_msg.source],
          to: [tx.in_msg.destination],
          type: TransferType.Receive,
          value,
        })
      }
    }
  }

  if (tx.out_msgs) {
    for (const outMsg of tx.out_msgs) {
      if (outMsg.value && outMsg.source && outMsg.destination) {
        const decodedType = outMsg.message_content?.decoded?.['@type']
        const value =
          decodedType === 'pton_ton_transfer' &&
          outMsg.message_content?.decoded?.ton_amount?.amount?.value
            ? outMsg.message_content.decoded.ton_amount.amount.value
            : outMsg.value
        if (BigInt(value) > 0n) {
          const isSend = addressesMatch(outMsg.source, pubkey)
          const isReceive = addressesMatch(outMsg.destination, pubkey)

          if (isSend) {
            transfers.push({
              assetId,
              from: [outMsg.source],
              to: [outMsg.destination],
              type: TransferType.Send,
              value,
            })
          }
          if (isReceive) {
            transfers.push({
              assetId,
              from: [outMsg.source],
              to: [outMsg.destination],
              type: TransferType.Receive,
              value,
            })
          }
        }
      }
    }
  }

  const isSend = transfers.some(transfer => transfer.type === TransferType.Send)

  return {
    txid,
    blockHeight: Number(tx.lt) || 0,
    blockTime: tx.now || 0,
    blockHash: undefined,
    chainId,
    confirmations: status === TxStatus.Confirmed ? 1 : 0,
    status,
    transfers,
    pubkey,
    ...(isSend && tx.total_fees && { fee: { assetId, value: tx.total_fees } }),
  }
}

// Raw message values misstate native swap legs (gas budgets ride the envelope, refunds ride the
// payout) - swap rows use the proxy TON jetton amount when present, net native flow otherwise
export const buildTraceTransfers = ({
  txs,
  jettonTransfers,
  traceId,
  pubkey,
  addressBook,
  assetId,
  chainId,
}: {
  txs: TonTx[]
  jettonTransfers: JettonTransferRecord[]
  traceId: string
  pubkey: string
  addressBook: Record<string, { user_friendly: string }>
  assetId: AssetId
  chainId: ChainId
}): TxTransfer[] => {
  const jetton = buildJettonTransfers(jettonTransfers, traceId, pubkey, addressBook, chainId)

  const seen = new Set<string>()
  const native: TxTransfer[] = []
  for (const tx of txs) {
    const parsed = parseTonTx(resolveAddresses(tx, addressBook), pubkey, '', assetId, chainId)
    for (const transfer of parsed.transfers) {
      // Scoped to the source tx so identical legs from different txs both survive
      const key = `${tx.hash}-${transfer.assetId}-${transfer.from[0]}-${transfer.to[0]}-${transfer.value}-${transfer.type}`
      if (seen.has(key)) continue
      seen.add(key)
      native.push(transfer)
    }
  }

  // Plain native transfers keep their per-leg values
  if (jetton.length === 0) return native

  const friendly = (addr: string) => addressBook[addr]?.user_friendly ?? addr

  const proxyAmounts: Partial<Record<TransferType, string>> = {}
  for (const transfer of jettonTransfers) {
    if (transfer.trace_id !== traceId) continue
    if (!transfer.source || !transfer.destination || !transfer.amount || !transfer.jetton_master)
      continue
    if (!isProxyTon(friendly(transfer.jetton_master))) continue

    // Summed per direction - split routes move the wrapped amount in multiple legs
    if (addressesMatch(friendly(transfer.source), pubkey)) {
      proxyAmounts[TransferType.Send] = (
        BigInt(proxyAmounts[TransferType.Send] ?? '0') + BigInt(transfer.amount)
      ).toString()
    }
    if (addressesMatch(friendly(transfer.destination), pubkey)) {
      proxyAmounts[TransferType.Receive] = (
        BigInt(proxyAmounts[TransferType.Receive] ?? '0') + BigInt(transfer.amount)
      ).toString()
    }
  }

  // Net native flow across the trace, gas envelopes and excess refunds included (fees excluded)
  let net = 0n
  for (const tx of txs) {
    if (tx.in_msg?.value && tx.in_msg.source) net += BigInt(tx.in_msg.value)
    for (const outMsg of tx.out_msgs ?? []) {
      if (outMsg.value) net -= BigInt(outMsg.value)
    }
  }

  const hasJettonSend = jetton.some(t => t.type === TransferType.Send)
  const hasJettonReceive = jetton.some(t => t.type === TransferType.Receive)
  const sends = native.filter(t => t.type === TransferType.Send)
  const receives = native.filter(t => t.type === TransferType.Receive)

  const nativeLegs: TxTransfer[] = []

  if (proxyAmounts[TransferType.Send] && sends.length === 1) {
    nativeLegs.push({ ...sends[0], value: proxyAmounts[TransferType.Send] })
  } else if (net < 0n && hasJettonReceive && !hasJettonSend && sends.length > 0) {
    nativeLegs.push({ ...sends[0], value: (-net).toString() })
  }

  if (proxyAmounts[TransferType.Receive] && receives.length === 1) {
    nativeLegs.push({ ...receives[0], value: proxyAmounts[TransferType.Receive] })
  } else if (net > 0n && hasJettonSend && !hasJettonReceive && receives.length > 0) {
    nativeLegs.push({ ...receives[0], value: net.toString() })
  }

  return [...nativeLegs, ...jetton]
}
