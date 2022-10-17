import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import type { ReduxState } from 'state/reducer'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectFeeAssetByChainId, selectTxById } from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

export type Transfer = TxTransfer & { asset: Asset; marketData: MarketData }
export type Fee = unchained.Fee & { asset: Asset; marketData: MarketData }

export type TxType = unchained.TransferType | unchained.TradeType | 'method' | 'unknown'

// Adding a new supported method?
// Also update transactionRow.parser translations and TransactionContract.tsx
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
  Outbound = 'outbound',
  Refund = 'refund',
  Out = 'out',
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

export const useTxDetails = (
  txId: string,
  assets: AssetsById,
  marketData: Record<AssetId, MarketData | undefined>,
  activeAsset?: Asset,
): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))

  const transfers = tx.transfers.reduce<Transfer[]>((prev, transfer) => {
    if (activeAsset && activeAsset.assetId !== transfer.assetId) return prev
    const asset = assets[transfer.assetId]
    return [
      ...prev,
      { ...transfer, asset, marketData: marketData[transfer.assetId] ?? defaultMarketData },
    ]
  }, [])

  const defaultFeeAsset = useAppSelector(state => selectFeeAssetByChainId(state, tx.chainId))
  const fee = tx.fee && {
    ...tx.fee,
    asset: assets[tx.fee.assetId] ?? defaultFeeAsset,
    marketData: marketData[tx.fee.assetId] ?? defaultMarketData,
  }

  return {
    tx,
    fee,
    transfers,
    type: getTxType(tx, transfers),
    explorerTxLink: fee?.asset?.explorerTxLink ?? defaultFeeAsset.explorerTxLink,
  }
}
