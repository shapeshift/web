import { Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
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
  const ref = useRef<HTMLDivElement | null>(null)
  const [parentWidth, setParentWidth] = useState(0)
  const transactions = useAppSelector(state => selectTxDateByIds(state, txIds))
  const borderTopColor = useColorModeValue('gray.100', 'gray.750')
  useEffect(() => {
    const resizeObserver = new ResizeObserver(event => {
      setParentWidth(event[0].contentBoxSize[0].inlineSize)
    })

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }
  }, [ref])
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
    return groups
  }, [transactions])

  const renderTxRows = useMemo(() => {
    return txRows.map((group: TransactionGroup) => (
      <Stack px={2} spacing={0} key={group.date}>
        {!useCompactMode && <TransactionDate blockTime={group.date} />}
        {group.txIds?.map((txId: TxId, index: number) => (
          <TransactionRow
            key={txId}
            txId={txId}
            useCompactMode={useCompactMode}
            showDateAndGuide={index === 0}
            parentWidth={parentWidth}
          />
        ))}
      </Stack>
    ))
  }, [parentWidth, txRows, useCompactMode])

  return (
    <Stack ref={ref} divider={<StackDivider borderColor={borderTopColor} />}>
      {renderTxRows}
    </Stack>
  )
}
