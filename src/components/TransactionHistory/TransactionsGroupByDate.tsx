import { Box, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { Fragment, useMemo } from 'react'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import { selectTxDateByIds } from 'state/slices/selectors'
import { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

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
  const transactions = useAppSelector(state => selectTxDateByIds(state, txIds))
  const borderTopColor = useColorModeValue('gray.100', 'gray.750')
  const txRows = useMemo(() => {
    const groups: TransactionGroup[] = []
    for (let index = 0; index < transactions.length; index++) {
      const transaction = transactions[index]
      const transactionDate = dayjs(transaction.date * 1000)
        .startOf('day')
        .unix()
      const group = groups.find(g => g.date === transactionDate)
      if (group) {
        group.txIds.push(transaction.txId)
      } else {
        groups.push({ date: transactionDate, txIds: [transaction.txId] })
      }
    }
    return groups.map((group: TransactionGroup) => (
      <Fragment key={group.date}>
        <Box borderTopWidth={1} borderColor={borderTopColor} mx={-2} />
        {group.txIds?.map((txId: TxId, index: number) => (
          <TransactionRow
            key={txId}
            txId={txId}
            useCompactMode={useCompactMode}
            showDateAndGuide={index === 0}
          />
        ))}
      </Fragment>
    ))
  }, [borderTopColor, transactions, useCompactMode])

  return <>{txRows}</>
}
