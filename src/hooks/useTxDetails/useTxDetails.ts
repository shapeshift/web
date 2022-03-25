import { Asset, chainAdapters, MarketData } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { ensReverseLookup } from 'lib/ens'
import { ReduxState } from 'state/reducer'
import { selectAssetByCAIP19, selectMarketDataById, selectTxById } from 'state/slices/selectors'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

// Adding a new supported method? Also update transactionRow.parser translations accordingly
const SUPPORTED_CONTRACT_METHODS = new Set([
  'deposit',
  'approve',
  'withdraw',
  'addLiquidityETH',
  'removeLiquidityETH',
  'transferOut'
])

export enum Direction {
  InPlace = 'in-place',
  Outbound = 'outbound',
  Inbound = 'inbound'
}

export interface TxDetails {
  tx: Tx
  buyTx?: chainAdapters.TxTransfer
  sellTx?: chainAdapters.TxTransfer
  tradeTx?: chainAdapters.TxTransfer
  feeAsset?: Asset
  buyAsset?: Asset
  sellAsset?: Asset
  value?: string
  to: string
  ensTo?: string
  from: string
  ensFrom?: string
  type: chainAdapters.TradeType | chainAdapters.TxType | ''
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
export const getBuyTx = (tx: Tx) => tx.transfers.find(t => t.type === chainAdapters.TxType.Receive)
export const getSellTx = (tx: Tx) => tx.transfers.find(t => t.type === chainAdapters.TxType.Send)

export const isSupportedContract = (tx: Tx) =>
  tx.data?.method ? SUPPORTED_CONTRACT_METHODS.has(tx.data?.method) : false

export const useTxDetails = (txId: string, activeAsset?: Asset): TxDetails => {
  const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))
  const method = tx.data?.method

  const standardTx = getStandardTx(tx)
  const buyTx = getBuyTx(tx)
  const sellTx = getSellTx(tx)

  const direction: Direction | undefined = (() => {
    switch (method) {
      case 'deposit':
      case 'addLiquidityETH':
      case 'transferOut':
        return Direction.Outbound
      case 'withdraw':
      case 'removeLiquidityETH':
        return Direction.Inbound
      case 'approve':
        return Direction.InPlace
      default:
        return undefined
    }
  })()

  const tradeTx = activeAsset?.caip19 === sellTx?.caip19 ? sellTx : buyTx

  const standardAsset = useAppSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, standardTx?.caip19 ?? '')
  )

  // stables need precision of eth (18) rather than 10
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, tx.fee?.caip19 ?? ''))
  const buyAsset = useAppSelector(state => selectAssetByCAIP19(state, buyTx?.caip19 ?? ''))
  const sellAsset = useAppSelector(state => selectAssetByCAIP19(state, sellTx?.caip19 ?? ''))
  const sourceMarketData = useAppSelector(state =>
    selectMarketDataById(state, sellTx?.caip19 ?? '')
  )
  const destinationMarketData = useAppSelector(state =>
    selectMarketDataById(state, buyTx?.caip19 ?? '')
  )
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, tx.fee?.caip19 ?? ''))
  const tradeAsset = activeAsset?.symbol === sellAsset?.symbol ? sellAsset : buyAsset

  const value = standardTx?.value ?? tradeTx?.value ?? undefined
  const to = standardTx?.to ?? tradeTx?.to ?? ''
  const from = standardTx?.from ?? tradeTx?.from ?? ''

  const [ensFrom, setEnsFrom] = useState<string>()
  const [ensTo, setEnsTo] = useState<string>()

  useEffect(() => {
    ;(async () => {
      const reverseFromLookup = await ensReverseLookup(from)
      const reverseToLookup = await ensReverseLookup(to)
      !reverseFromLookup.error && setEnsFrom(reverseFromLookup.name)
      !reverseToLookup.error && setEnsTo(reverseToLookup.name)
    })()
  }, [from, to])
  const type = isSupportedContract(tx)
    ? chainAdapters.TxType.Contract
    : standardTx?.type ?? tx.tradeDetails?.type ?? ''
  const symbol = standardAsset?.symbol ?? tradeAsset?.symbol ?? ''
  const precision = standardAsset?.precision ?? tradeAsset?.precision ?? 18
  const explorerTxLink =
    standardAsset?.explorerTxLink ?? tradeAsset?.explorerTxLink ?? feeAsset?.explorerTxLink ?? ''
  const explorerAddressLink =
    standardAsset?.explorerAddressLink ??
    tradeAsset?.explorerAddressLink ??
    feeAsset?.explorerAddressLink ??
    ''

  return {
    tx,
    buyTx,
    sellTx,
    tradeTx,
    feeAsset,
    buyAsset,
    sellAsset,
    value,
    to,
    ensTo,
    from,
    ensFrom,
    type,
    symbol,
    precision,
    explorerTxLink,
    explorerAddressLink,
    direction,
    sourceMarketData,
    destinationMarketData,
    feeMarketData
  }
}
