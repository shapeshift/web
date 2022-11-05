import type { Asset } from '@keepkey/asset-service'
import { ethChainId } from '@keepkey/caip'
import type { TxTransfer } from '@keepkey/chain-adapters'
import type { MarketData } from '@keepkey/types'
import { TradeType, TransferType } from '@keepkey/unchained-client'
import { useEnsName } from 'wagmi'
import type { ReduxState } from 'state/reducer'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

// Adding a new supported method? Also update transactionRow.parser translations accordingly
export enum ContractMethod {
  Deposit = 'deposit',
  Approve = 'approve',
  Withdraw = 'withdraw',
  AddLiquidityEth = 'addLiquidityETH',
  RemoveLiquidityEth = 'removeLiquidityETH',
  TransferOut = 'transferOut',
  Stake = 'stake',
  Unstake = 'unstake',
  InstantUnstake = 'instantUnstake',
  ClaimWithdraw = 'claimWithdraw',
  Exit = 'exit',
}

export enum Direction {
  InPlace = 'in-place',
  Outbound = 'outbound',
  Inbound = 'inbound',
}

export interface TxDetails {
  tx: Tx
  buyTransfer?: TxTransfer
  sellTransfer?: TxTransfer
  tradeTx?: TxTransfer
  feeAsset?: Asset
  buyAsset?: Asset
  sellAsset?: Asset
  value?: string
  to: string
  ensTo?: string
  from: string
  ensFrom?: string
  type: TradeType | TransferType | ''
  symbol: string
  precision: number
  explorerTxLink: string
  explorerAddressLink: string
  direction?: Direction
  sourceMarketData: MarketData
  destinationMarketData: MarketData
  feeMarketData: MarketData
}

export const getStandardTx = (tx: Tx) => (tx.transfers.length === 1 ? tx.transfers[0] : undefined)
export const getTransferByType = (tx: Tx, TransferType: TransferType) =>
  tx.transfers.find(t => t.type === TransferType)
export const getBuyTransfer = (tx: Tx) => getTransferByType(tx, TransferType.Receive)
export const getSellTransfer = (tx: Tx) => getTransferByType(tx, TransferType.Send)
export const getTransferByAsset = (tx: Tx, asset: Asset) =>
  tx.transfers.find(t => t.assetId === asset.assetId)

export const isSupportedContract = (tx: Tx) =>
  Object.values(ContractMethod).includes(tx.data?.method as ContractMethod)

/**
 * isTradeContract
 *
 * Returns true when a tx has transfers matching the generalized idea of a
 * trade (i.e. some account sells to pool A and buys from pool B).
 *
 * @param buyTransfer transfer with TransferType.Receive
 * @param sellTransfer transfer with TransferType.Send
 * @returns boolean
 */
export const isTradeContract = (buyTransfer: TxTransfer, sellTransfer: TxTransfer): boolean => {
  return sellTransfer.from === buyTransfer.to && sellTransfer.to !== buyTransfer.from
}

export const useTxDetails = (txId: string, activeAsset?: Asset): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))
  const method = tx.data?.method

  const standardTx = getStandardTx(tx)
  const buyTransfer = getTransferByType(tx, TransferType.Receive)
  const sellTransfer = getTransferByType(tx, TransferType.Send)
  const tradeTx = (activeAsset && getTransferByAsset(tx, activeAsset)) ?? buyTransfer

  const direction: Direction | undefined = (() => {
    switch (method) {
      case ContractMethod.Deposit:
      case ContractMethod.AddLiquidityEth:
      case ContractMethod.TransferOut:
      case ContractMethod.Stake:
        return Direction.Outbound
      case ContractMethod.Withdraw:
      case ContractMethod.RemoveLiquidityEth:
      case ContractMethod.Unstake:
      case ContractMethod.InstantUnstake:
      case ContractMethod.ClaimWithdraw:
      case ContractMethod.Exit:
        return Direction.Inbound
      case ContractMethod.Approve:
        return Direction.InPlace
      default:
        return undefined
    }
  })()

  const standardAsset = useAppSelector((state: ReduxState) =>
    selectAssetById(state, standardTx?.assetId ?? ''),
  )

  // stables need precision of eth (18) rather than 10
  const defaultFeeAsset = useAppSelector(state => selectFeeAssetByChainId(state, tx.chainId))
  const feeAsset = useAppSelector(state => selectAssetById(state, tx.fee?.assetId ?? ''))
  const buyAsset = useAppSelector(state => selectAssetById(state, buyTransfer?.assetId ?? ''))
  const sellAsset = useAppSelector(state => selectAssetById(state, sellTransfer?.assetId ?? ''))
  const tradeAsset = activeAsset?.symbol === sellAsset?.symbol ? sellAsset : buyAsset
  const sourceMarketData = useAppSelector(state =>
    selectMarketDataById(state, sellTransfer?.assetId ?? ''),
  )
  const destinationMarketData = useAppSelector(state =>
    selectMarketDataById(state, buyTransfer?.assetId ?? ''),
  )
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, tx.fee?.assetId ?? ''))

  const value = standardTx?.value ?? tradeTx?.value ?? undefined
  const to = standardTx?.to ?? tradeTx?.to ?? ''
  const from = standardTx?.from ?? tradeTx?.from ?? ''

  const { data: ensFrom = '' } = useEnsName({
    address: from,
    cacheTime: Infinity, // Cache a given ENS reverse resolution response infinitely for the lifetime of a tab / until app reload
    staleTime: Infinity, // Cache a given ENS reverse resolution query infinitely for the lifetime of a tab / until app reload
    enabled: tx.chainId === ethChainId,
  })

  const { data: ensTo = '' } = useEnsName({
    address: to,
    cacheTime: Infinity, // Cache a given ENS reverse resolution response infinitely for the lifetime of a tab / until app reload
    staleTime: Infinity, // Cache a given ENS reverse resolution query infinitely for the lifetime of a tab / until app reload
    enabled: tx.chainId === ethChainId,
  })

  const tradeType =
    buyTransfer && sellTransfer && isTradeContract(buyTransfer, sellTransfer)
      ? TradeType.Trade
      : undefined
  const type = isSupportedContract(tx)
    ? TransferType.Contract
    : standardTx?.type ?? tx.trade?.type ?? tradeType ?? ''
  const symbol = standardAsset?.symbol ?? tradeAsset?.symbol ?? ''
  const precision = standardAsset?.precision ?? tradeAsset?.precision ?? 18
  const explorerTxLink =
    standardAsset?.explorerTxLink ??
    tradeAsset?.explorerTxLink ??
    feeAsset?.explorerTxLink ??
    defaultFeeAsset?.explorerTxLink ??
    ''
  const explorerAddressLink =
    standardAsset?.explorerAddressLink ??
    tradeAsset?.explorerAddressLink ??
    feeAsset?.explorerAddressLink ??
    defaultFeeAsset?.explorerAddressLink ??
    ''

  return {
    tx,
    buyTransfer,
    sellTransfer,
    tradeTx,
    feeAsset,
    buyAsset,
    sellAsset,
    value,
    to,
    ensTo: ensTo!,
    from,
    ensFrom: ensFrom!,
    type,
    symbol,
    precision,
    explorerTxLink,
    explorerAddressLink,
    direction,
    sourceMarketData,
    destinationMarketData,
    feeMarketData,
  }
}
