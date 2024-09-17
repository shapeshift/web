import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'
import type { ReduxState } from 'state/reducer'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssets, selectFeeAssetByChainId, selectTxById } from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { deserializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

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

export const getTransfers = (tx: Tx, assets: AssetsByIdPartial): Transfer[] => {
  return tx.transfers.reduce<Transfer[]>((prev, transfer) => {
    const asset = assets[transfer.assetId]

    if (asset) {
      prev.push({
        ...transfer,
        asset: {
          ...asset,
          symbol: asset.symbol || transfer.token?.symbol || '',
          name: asset.name || transfer.token?.name || '',
        },
      })
    } else {
      prev.push({ ...transfer, asset: defaultAsset })
    }

    return prev
  }, [])
}

export const useTxDetails = (txId: string): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))
  const assets = useAppSelector(selectAssets)

  // This should never happen, but if it does we should not continue
  if (!tx) throw Error('Transaction not found')

  const accountId = useMemo(() => deserializeTxIndex(txId).accountId, [txId])

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId,
    accountId,
  })

  const transfers = useMemo(() => getTransfers(tx, assets), [tx, assets])

  const fee = useMemo(() => {
    if (!tx?.fee) return

    return {
      ...tx.fee,
      asset: assets[tx.fee.assetId] ?? defaultAsset,
    }
  }, [tx?.fee, assets])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, tx.chainId))

  const txLink = getTxLink({
    name: tx.trade?.dexName,
    defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
    txId: tx.txid,
    maybeSafeTx,
    accountId,
  })

  return {
    tx,
    fee,
    transfers,
    type: getTxType(tx, transfers),
    txLink,
  }
}
