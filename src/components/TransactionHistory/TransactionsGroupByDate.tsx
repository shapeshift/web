import { Box, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { Fragment, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import { selectAssetByCAIP19, selectTxDateByIds } from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'
import { MatchParams } from 'pages/Assets/Asset'

type TransactionsGroupByDateProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

type TransactionGroup = {
  date: number
  txIds: TxId[]
}

export const TransactionsGroupByDate: React.FC<TransactionsGroupByDateProps> = ({
  txIds,
  useCompactMode = false
}) => {
  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const transactions = useAppSelector(state => selectTxDateByIds(state, txIds))
  const borderTopColor = useColorModeValue('gray.100', 'gray.750')
  const txRows = useMemo(() => {
    const groups: TransactionGroup[] = transactions.reduce(
      (acc: TransactionGroup[], transaction) => {
        const transactionDate = dayjs(transaction.date * 1000)
          .startOf('day')
          .unix()
        const group = acc.find(g => g.date === transactionDate)
        if (group) {
          group.txIds.push(transaction.txId)
        } else {
          acc.push({ date: transactionDate, txIds: [transaction.txId] })
        }
        return acc
      }, 
    [])

    return groups.map((group: TransactionGroup) => (
      <Fragment key={group.date}>
        <Box borderTopWidth={1} borderColor={borderTopColor} mx={-2} />
        {group.txIds?.map((txId: TxId, index: number) => (
          <TransactionRow
            key={txId}
            txId={txId}
            activeAsset={asset}
            useCompactMode={useCompactMode}
            showDateAndGuide={index === 0}
          />
        ))}
      </Fragment>
    ))
  }, [asset, borderTopColor, transactions, useCompactMode])

  return <>{txRows}</>
}
