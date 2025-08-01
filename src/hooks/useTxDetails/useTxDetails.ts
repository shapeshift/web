import { fromAccountId, isNft } from '@shapeshiftoss/caip'
import type { EvmChainAdapter, TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { makeAsset } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { getTxLink } from '@/lib/getTxLink'
import type { ReduxState } from '@/state/reducer'
import { assets as assetsSlice, defaultAsset } from '@/state/slices/assetsSlice/assetsSlice'
import { selectAssets, selectFeeAssetByChainId, selectTxById } from '@/state/slices/selectors'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { deserializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import type { AppDispatch } from '@/state/store'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type Transfer = TxTransfer & { asset: Asset }
export type Fee = unchained.Fee & { asset: Asset }

export type TxType = unchained.TransferType | unchained.TradeType | 'method' | 'common'

// Adding a new supported method?
// Also update transactionRow.parser translations and TransactionMethod.tsx
export enum Method {
  AddLiquidityEth = 'addLiquidityETH',
  Approve = 'approve',
  BeginRedelegate = 'begin_redelegate',
  BeginUnbonding = 'begin_unbonding',
  CreateRetryableTicket = 'createRetryableTicket',
  ClaimWithdraw = 'claimWithdraw',
  Delegate = 'delegate',
  Deposit = 'deposit',
  DepositEth = 'depositEth',
  DepositRefund = 'depositRefund',
  DepositRefundNative = 'depositRefundNative',
  ExecuteTransaction = 'executeTransaction',
  Exit = 'exit',
  ExitPool = 'exit_pool',
  FinalizeInboundTransferDeposit = 'finalizeInboundTransferDeposit',
  InstantUnstake = 'instantUnstake',
  JoinPool = 'join_pool',
  LoanOpen = 'loanOpen',
  LoanOpenOut = 'loanOpenOut',
  LoanOpenRefund = 'loanOpenRefund',
  LoanRepayment = 'loanRepayment',
  LoanRepaymentOut = 'loanRepaymentOut',
  LoanRepaymentRefund = 'loanRepaymentRefund',
  LoanRepaymentRefundNative = 'loanRepaymentRefundNative',
  Out = 'out',
  OutboundTransfer = 'outboundTransfer',
  OutboundTransferDeposit = 'outboundTransferDeposit',
  RecvPacket = 'recv_packet',
  Refund = 'refund',
  RemoveLiquidityEth = 'removeLiquidityETH',
  Revoke = 'revoke',
  Reward = 'reward',
  SetRuneAddress = 'setRuneAddress',
  Stake = 'stake',
  SubmitRetryable = 'submitRetryable',
  SwapOut = 'swapOut',
  SwapRefund = 'swapRefund',
  Transfer = 'transfer',
  Unstake = 'unstake',
  UnstakeRequest = 'unstakeRequest',
  Withdraw = 'withdraw',
  WithdrawNative = 'withdrawNative',
  WithdrawDelegatorReward = 'withdraw_delegator_reward',
  WithdrawOut = 'withdrawOut',
  WithdrawEth = 'withdrawEth',
}

export interface TxDetails {
  tx: Tx
  transfers: Transfer[]
  fee?: Fee
  type: TxType
  txLink: string
}

export const isSupportedMethod = (tx: Tx) =>
  Object.values(Method).includes(tx.data?.method as Method)

export const getTxType = (tx: Tx, transfers: Transfer[]): TxType => {
  if (tx.trade) return tx.trade.type
  if (isSupportedMethod(tx)) return 'method'
  if (transfers.length === 1) return transfers[0].type // standard send/receive
  return 'common'
}

export const getTransfers = (
  tx: Tx,
  assets: AssetsByIdPartial,
  dispatch?: AppDispatch,
): Transfer[] => {
  return tx.transfers.reduce<Transfer[]>((prev, transfer) => {
    const asset = assets[transfer.assetId]

    if (asset) {
      prev.push({
        ...transfer,
        asset: {
          ...asset,
          symbol: asset.symbol || transfer.token?.symbol || 'N/A',
          name: asset.name || transfer.token?.name || 'Unknown',
        },
      })
    } else {
      const minimalAsset: MinimalAsset = {
        assetId: transfer.assetId,
        id: transfer.id,
        symbol: transfer.token?.symbol || defaultAsset.symbol,
        name: transfer.token?.name || defaultAsset.name,
        precision: isNft(transfer.assetId) ? 0 : transfer.token?.decimals ?? defaultAsset.precision,
      }

      const asset = makeAsset(assets, minimalAsset)

      dispatch && dispatch(assetsSlice.actions.upsertAsset(asset))

      prev.push({ ...transfer, asset })
    }

    return prev
  }, [])
}

export const useTxDetails = (txId: string | undefined): TxDetails | undefined => {
  const dispatch = useAppDispatch()

  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId ?? ''))
  const assets = useAppSelector(selectAssets)

  const accountId = useMemo(() => {
    if (!txId || !tx) return ''
    return deserializeTxIndex(txId).accountId
  }, [txId, tx])

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId,
    accountId,
  })

  const transfers = useMemo(() => {
    if (!tx) return []
    return getTransfers(tx, assets, dispatch)
  }, [tx, assets, dispatch])

  const fee = useMemo(() => {
    if (!tx?.fee) return
    return {
      ...tx.fee,
      asset: assets[tx.fee.assetId] ?? defaultAsset,
    }
  }, [tx?.fee, assets])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, tx?.chainId ?? ''))

  const txLink = useMemo(() => {
    if (!tx) return
    return getTxLink({
      stepSource: tx.trade?.dexName,
      defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
      txId: tx.txid,
      maybeSafeTx,
      address: fromAccountId(accountId).account,
      chainId: fromAccountId(accountId).chainId,
    })
  }, [tx, feeAsset?.explorerTxLink, maybeSafeTx, accountId])

  if (!tx || !txLink) return

  return {
    tx,
    fee,
    transfers,
    type: getTxType(tx, transfers),
    txLink,
  }
}

// The same as above, but fetches from the network, allowing for *both* serialized Txids present in the store, and those that aren't to yield a similar shape,
// so long as you pass as a serialized TxId in.
export const useTxDetailsQuery = (txId: string | undefined): TxDetails | undefined => {
  const dispatch = useAppDispatch()

  const assets = useAppSelector(selectAssets)

  const accountId = useMemo(() => {
    if (!txId) return ''
    return deserializeTxIndex(txId).accountId
  }, [txId])

  const txHash = useMemo(() => {
    if (!txId) return
    return deserializeTxIndex(txId).txid
  }, [txId])

  const chainId = accountId ? fromAccountId(accountId).chainId : ''

  const adapter = getChainAdapterManager().get(chainId)

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId,
    accountId,
  })

  const { data } = useQuery({
    queryKey: ['txDetails', txHash],
    queryFn:
      txHash && adapter
        ? async () => {
            // Casted for the sake of simplicity
            const tx = await (adapter as EvmChainAdapter).httpProvider.getTransaction({
              txid: txHash,
            })

            return adapter.parseTx(tx, fromAccountId(accountId).account)
          }
        : skipToken,
  })

  const transfers = useMemo(() => {
    if (!data) return
    return getTransfers(data, assets, dispatch)
  }, [data, assets, dispatch])

  const fee = useMemo(() => {
    if (!data?.fee) return
    return {
      ...data.fee,
      asset: assets[data.fee.assetId] ?? defaultAsset,
    }
  }, [data?.fee, assets])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, data?.chainId ?? ''))

  const txLink = useMemo(() => {
    if (!data) return
    return getTxLink({
      stepSource: data.trade?.dexName,
      defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
      txId: data.txid,
      maybeSafeTx,
      address: fromAccountId(accountId).account,
      chainId: fromAccountId(accountId).chainId,
    })
  }, [data, feeAsset?.explorerTxLink, maybeSafeTx, accountId])

  if (!data || !txLink || !transfers) return

  return {
    tx: data,
    fee,
    transfers,
    type: getTxType(data, transfers),
    txLink,
  }
}
