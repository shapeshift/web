import dayjs from 'dayjs'
import { useMemo } from 'react'
import { TransactionRow } from 'components/Transactions/TransactionRow'
import { TransactionRow as TransactionCompactRow } from 'components/TransactionsCompact/TransactionRow'
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
  console.info(transactions)
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
      <>
        {group.txIds?.map((txId: TxId, index: number) => (
          <TransactionRow key={txId} txId={txId} showDateAndGuide={index === 0} />
        ))}
      </>
    ))
  }, [transactions])

  const txCompactRows = useMemo(() => {
    return (
      <>
        {txIds?.map((txId: TxId, index: number) => (
          <TransactionCompactRow key={txId} txId={txId} />
        ))}
      </>
    )
  }, [txIds])

  return <>{useCompactMode ? txCompactRows : txRows}</>
}
