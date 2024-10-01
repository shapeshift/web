import { Skeleton, Stack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { Text } from 'components/Text'
import {
  TransactionRow,
  TransactionRowFromTxDetails,
} from 'components/TransactionHistoryRows/TransactionRow'
import { useResizeObserver } from 'hooks/useResizeObserver/useResizeObserver'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import type { ReduxState } from 'state/reducer'
import { selectTxById } from 'state/slices/selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { deserializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type RewardTransactionListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  isLoading?: boolean
  getTxDetails: (txId: TxId) => TxDetails | undefined
}

type RewardTransactionProps = {
  txId: string
  useCompactMode?: boolean
  entry: ResizeObserverEntry | undefined
  getTxDetails: (txId: TxId) => TxDetails | undefined
}

const RewardTransaction = memo(
  ({ txId, useCompactMode, entry, getTxDetails }: RewardTransactionProps) => {
    const tx = useAppSelector((state: ReduxState) => selectTxById(state, txId))

    if (tx) {
      return (
        <TransactionRow
          key={txId}
          txId={txId}
          useCompactMode={useCompactMode}
          parentWidth={entry?.contentRect.width ?? 360}
        />
      )
    }

    const { txid } = deserializeTxIndex(txId)

    const txDetails = getTxDetails(txid)

    if (!txDetails) return null

    return (
      <TransactionRowFromTxDetails
        key={txId}
        useCompactMode={useCompactMode}
        parentWidth={entry?.contentRect.width ?? 360}
        txDetails={txDetails}
        disableCollapse={!txid}
        topRight={
          txid ? undefined : (
            <Text
              fontSize='sm'
              fontWeight='bold'
              color='yellow.300'
              translation='RFOX.pendingDistribution'
            />
          )
        }
      />
    )
  },
)

const RewardsTransactions = memo(
  ({ txIds, useCompactMode, getTxDetails }: Omit<RewardTransactionListProps, 'isLoading'>) => {
    const { setNode, entry } = useResizeObserver()

    const renderedTxRows = useMemo(() => {
      return (
        <>
          {txIds?.map(txId => (
            <RewardTransaction
              key={txId}
              txId={txId}
              useCompactMode={useCompactMode}
              entry={entry}
              getTxDetails={getTxDetails}
            />
          ))}
        </>
      )
    }, [entry, getTxDetails, txIds, useCompactMode])

    return (
      <Stack px={2} spacing={2} ref={setNode}>
        {renderedTxRows}
      </Stack>
    )
  },
)

export const RewardTransactionList = ({
  isLoading,
  txIds,
  useCompactMode,
  getTxDetails,
}: RewardTransactionListProps) => {
  return (
    <Skeleton isLoaded={!isLoading}>
      <RewardsTransactions
        txIds={txIds}
        useCompactMode={useCompactMode}
        getTxDetails={getTxDetails}
      />
    </Skeleton>
  )
}
