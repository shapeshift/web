import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import { getTxBaseUrl } from 'lib/getTxLink'
import type { ReduxState } from 'state/reducer'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectMarketDataSortedByMarketCap,
  selectTxById,
} from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

export type Transfer = TxTransfer & { asset: Asset; marketData: MarketData }
export type Fee = unchained.Fee & { asset: Asset; marketData: MarketData }

export type TxType = unchained.TransferType | unchained.TradeType | 'method' | 'unknown'

// Adding a new supported method?
// Also update transactionRow.parser translations and TransactionMethod.tsx
export enum Method {
  Deposit = 'deposit',
  Approve = 'approve',
  Revoke = 'revoke',
  Withdraw = 'withdraw',
  AddLiquidityEth = 'addLiquidityETH',
  RemoveLiquidityEth = 'removeLiquidityETH',
  TransferOut = 'transferOut',
  Stake = 'stake',
  Unstake = 'unstake',
  InstantUnstake = 'instantUnstake',
  ClaimWithdraw = 'claimWithdraw',
  Exit = 'exit',
  Delegate = 'delegate',
  BeginUnbonding = 'begin_unbonding',
  BeginRedelegate = 'begin_redelegate',
  WithdrawDelegatorReward = 'withdraw_delegator_reward',
  Outbound = 'outbound',
  Refund = 'refund',
  Out = 'out',
  Transfer = 'transfer',
  RecvPacket = 'recv_packet',
}

export interface TxDetails {
  tx: Tx
  transfers: Transfer[]
  fee?: Fee
  type: TxType
  explorerTxLink: string
}

export const isSupportedMethod = (tx: Tx) =>
  Object.values(Method).includes(tx.data?.method as Method)

export const getTxType = (tx: Tx, transfers: Transfer[]): TxType => {
  if (tx.trade) return tx.trade.type
  if (isSupportedMethod(tx)) return 'method'
  if (transfers.length === 1) return transfers[0].type // standard send/receive
  return 'unknown'
}

export const getTransfers = (
  transfers: TxTransfer[],
  assets: AssetsById,
  marketData: Record<AssetId, MarketData | undefined>,
): Transfer[] => {
  return transfers.reduce<Transfer[]>((prev, transfer) => {
    const asset = assets[transfer.assetId]
    return asset
      ? [
          ...prev,
          { ...transfer, asset, marketData: marketData[transfer.assetId] ?? defaultMarketData },
        ]
      : prev
  }, [])
}

export const useTxDetails = (txId: string): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const transfers = useMemo(
    () => getTransfers(tx.transfers, assets, marketData),
    [tx.transfers, assets, marketData],
  )

  const fee = useMemo(() => {
    if (!tx.fee) return
    return {
      ...tx.fee,
      asset: assets[tx.fee.assetId] ?? defaultAsset,
      marketData: marketData[tx.fee.assetId] ?? defaultMarketData,
    }
  }, [tx.fee, assets, marketData])

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, tx.chainId))

  const explorerTxLink = getTxBaseUrl({
    name: tx.trade?.dexName,
    defaultExplorerBaseUrl: feeAsset?.explorerTxLink ?? '',
  })

  return {
    tx,
    fee,
    transfers,
    type: getTxType(tx, transfers),
    explorerTxLink,
  }
}
