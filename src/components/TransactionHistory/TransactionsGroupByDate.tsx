import { Stack, StackDivider } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import { useResizeObserver } from 'hooks/useResizeObserver/useResizeObserver'
import { selectSelectedLocale, selectTxDateByIds } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type TransactionsGroupByDateProps = {
  txIds: TxId[]
  useCompactMode?: boolean
}

type TransactionGroup = {
  date: string
  txIds: TxId[]
}

const divider = <StackDivider borderColor='border.base' />

export const TransactionsGroupByDate: React.FC<TransactionsGroupByDateProps> = memo(
  ({ txIds, useCompactMode = false }) => {
    const { setNode, entry } = useResizeObserver()
    const translate = useTranslate()
    const locale = useAppSelector(selectSelectedLocale)
    const transactions = useAppSelector(state => selectTxDateByIds(state, txIds))
    const txRows = useMemo(() => {
      const groups: TransactionGroup[] = []
      for (let index = 0; index < transactions.length; index++) {
        const transaction = transactions[index]
        const now = dayjs().locale(locale)
        const transactionDate = dayjs(transaction.date * 1000).locale(locale)
        const formattedDate = (() => {
          if (now.isSame(transactionDate, 'day')) {
            return translate('transactionHistory.today')
          } else if (now.subtract(1, 'day').isSame(transactionDate, 'day')) {
            return translate('transactionHistory.yesterday')
          } else if (now.isSame(transactionDate, 'week')) {
            return translate('transactionHistory.thisWeek')
          } else if (now.isSame(transactionDate, 'month')) {
            return translate('transactionHistory.thisMonth')
          } else if (now.isSame(transactionDate, 'year')) {
            return transactionDate.format('MMMM')
          } else {
            return transactionDate.format('MMMM YYYY')
          }
        })()
        const group = groups.find(g => g.date === formattedDate)
        if (group) {
          group.txIds.push(transaction.txId)
        } else {
          groups.push({ date: formattedDate, txIds: [transaction.txId] })
        }
      }
      return groups
    }, [locale, transactions, translate])

    const renderTxRows = useMemo(() => {
      return txRows.map((group: TransactionGroup) => (
        <Stack px={2} spacing={2} key={group.date}>
          <RawText px={4} fontSize='md' fontWeight='medium'>
            {group.date}
          </RawText>
          {group.txIds?.map((txId: TxId, index: number) => (
            <TransactionRow
              key={txId}
              txId={txId}
              useCompactMode={useCompactMode}
              showDateAndGuide={index === 0}
              parentWidth={entry?.contentRect.width ?? 360}
            />
          ))}
        </Stack>
      ))
    }, [entry?.contentRect.width, txRows, useCompactMode])

    return (
      <Stack ref={setNode} divider={divider}>
        {renderTxRows}
      </Stack>
    )
  },
)
