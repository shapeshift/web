import { Asset, chainAdapters } from '@shapeshiftoss/types'
import { TradeType, TxTransfer, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { ensReverseLookup } from 'lib/ens'
import { ReduxState } from 'state/reducer'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { selectTxById, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

export interface TxDetails {
  tx: Tx
  buyTx: TxTransfer | undefined
  sellTx: TxTransfer | undefined
  tradeTx: TxTransfer | undefined
  feeAsset: Asset
  buyAsset: Asset
  sellAsset: Asset
  value: string
  to: string
  ensTo?: string
  from: string
  ensFrom?: string
  type: TradeType | TxType | ''
  symbol: string
  precision: number
  explorerTxLink: string
  explorerAddressLink: string
}

export const getStandardTx = (tx: Tx) => (tx.transfers.length === 1 ? tx.transfers[0] : undefined)
export const getBuyTx = (tx: Tx) =>
  !!tx.tradeDetails ? tx.transfers.find(t => t.type === chainAdapters.TxType.Receive) : undefined
export const getSellTx = (tx: Tx) =>
  !!tx.tradeDetails ? tx.transfers.find(t => t.type === chainAdapters.TxType.Send) : undefined

export const useTxDetails = (txId: string, activeAsset?: Asset): TxDetails => {
  const tx = useSelector((state: ReduxState) => selectTxById(state, txId))

  const standardTx = getStandardTx(tx)
  const buyTx = getBuyTx(tx)
  const sellTx = getSellTx(tx)

  const tradeTx = activeAsset?.caip19 === sellTx?.caip19 ? sellTx : buyTx

  const standardAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, standardTx?.caip19 ?? '')
  )

  // stables need precision of eth (18) rather than 10
  const feeAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, tx.fee?.caip19 ?? '')
  )
  const buyAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, buyTx?.caip19 ?? '')
  )
  const sellAsset = useSelector((state: ReduxState) =>
    selectAssetByCAIP19(state, sellTx?.caip19 ?? '')
  )
  const tradeAsset = activeAsset?.symbol === sellAsset?.symbol ? sellAsset : buyAsset

  const value = standardTx?.value ?? tradeTx?.value ?? '0'
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
  const type = standardTx?.type ?? tx.tradeDetails?.type ?? ''
  const symbol = standardAsset?.symbol ?? tradeAsset?.symbol ?? ''
  const precision = standardAsset?.precision ?? tradeAsset?.precision ?? 18
  const explorerTxLink = standardAsset?.explorerTxLink ?? tradeAsset?.explorerTxLink ?? ''
  const explorerAddressLink =
    standardAsset?.explorerAddressLink ?? tradeAsset?.explorerAddressLink ?? ''

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
    explorerAddressLink
  }
}
