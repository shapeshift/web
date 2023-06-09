import type { AssetId } from '@shapeshiftoss/caip'
import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import type { Asset } from 'lib/asset-service'
import { getTxBaseUrl } from 'lib/getTxLink'
import type { ReduxState } from 'state/reducer'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
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
  AddLiquidityEth = 'addLiquidityETH',
  Approve = 'approve',
  BeginRedelegate = 'begin_redelegate',
  BeginUnbonding = 'begin_unbonding',
  ClaimWithdraw = 'claimWithdraw',
  Delegate = 'delegate',
  Deposit = 'deposit',
  Exit = 'exit',
  ExitPool = 'exit_pool',
  InstantUnstake = 'instantUnstake',
  JoinPool = 'join_pool',
  Out = 'out',
  Outbound = 'outbound',
  RecvPacket = 'recv_packet',
  Refund = 'refund',
  RemoveLiquidityEth = 'removeLiquidityETH',
  Revoke = 'revoke',
  Stake = 'stake',
  Transfer = 'transfer',
  TransferOut = 'transferOut',
  Unstake = 'unstake',
  Withdraw = 'withdraw',
  WithdrawDelegatorReward = 'withdraw_delegator_reward',
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
  tx: Tx,
  assets: AssetsById,
  marketData: Record<AssetId, MarketData | undefined>,
): Transfer[] => {
  return tx.transfers.reduce<Transfer[]>((prev, transfer) => {
    const asset = assets[transfer.assetId]

    if (asset) {
      prev.push({
        ...transfer,
        asset,
        marketData: marketData[transfer.assetId] ?? defaultMarketData,
      })
    } else {
      prev.push({ ...transfer, asset: defaultAsset, marketData: defaultMarketData })
    }

    return prev
  }, [])
}

export const useTxDetails = (txId: string): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)

  const transfers = useMemo(() => getTransfers(tx, assets, marketData), [tx, assets, marketData])

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
