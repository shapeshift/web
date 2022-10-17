import { Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import { useResizeObserver } from 'hooks/useResizeObserver/useResizeObserver'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { selectAssetById, selectTxDateByIds } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
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
  useCompactMode = false,
}) => {
  const assetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { setNode, entry } = useResizeObserver()
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
    return groups
  }, [transactions])

  const renderTxRows = useMemo(() => {
    return txRows.map((group: TransactionGroup) => (
      <Stack px={2} spacing={2} key={group.date}>
        {!useCompactMode && <TransactionDate blockTime={group.date} />}
        {group.txIds?.map((txId: TxId, index: number) => (
          <TransactionRow
            key={txId}
            txId={txId}
            activeAsset={asset}
            useCompactMode={useCompactMode}
            showDateAndGuide={index === 0}
            parentWidth={entry?.contentRect.width ?? 360}
          />
        ))}
      </Stack>
    ))
  }, [asset, entry?.contentRect.width, txRows, useCompactMode])

  return (
    <Stack ref={setNode} divider={<StackDivider borderColor={borderTopColor} />}>
      {renderTxRows}
    </Stack>
  )
}
