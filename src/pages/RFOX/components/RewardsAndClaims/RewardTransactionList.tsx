import { Skeleton, Stack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { TransactionRowFromTxDetails } from 'components/TransactionHistoryRows/TransactionRow'
import { useResizeObserver } from 'hooks/useResizeObserver/useResizeObserver'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

type RewardTransactionListProps = {
  txIds: TxId[]
  useCompactMode?: boolean
  isLoading?: boolean
  getTxDetails: (txId: TxId) => TxDetails | undefined
}

const RewardTransactionListLoaded = memo(
  ({ txIds, useCompactMode, getTxDetails }: Omit<RewardTransactionListProps, 'isLoading'>) => {
    const { setNode, entry } = useResizeObserver()

    const renderedTxRows = useMemo(() => {
      return (
        <>
          {txIds?.map((txId: TxId, index: number) => {
            const txDetails = getTxDetails(txId)
            if (!txDetails) return null
            return (
              <TransactionRowFromTxDetails
                key={txId}
                useCompactMode={useCompactMode}
                showDateAndGuide={index === 0}
                parentWidth={entry?.contentRect.width ?? 360}
                txDetails={txDetails}
              />
            )
          })}
        </>
      )
    }, [entry?.contentRect.width, getTxDetails, txIds, useCompactMode])

    return (
      <Stack px={2} spacing={2} ref={setNode}>
        {renderedTxRows}
      </Stack>
    )
  },
)

const RewardTransactionListLoading = () => {
  return (
    <Stack px={2} spacing={2}>
      {new Array(2).fill(null).map((_, i) => (
        <Skeleton key={i} height={16} />
      ))}
    </Stack>
  )
}

export const RewardTransactionList = ({
  isLoading,
  txIds,
  useCompactMode,
  getTxDetails,
}: RewardTransactionListProps) => {
  if (isLoading) return <RewardTransactionListLoading />
  return (
    <RewardTransactionListLoaded
      txIds={txIds}
      useCompactMode={useCompactMode}
      getTxDetails={getTxDetails}
    />
  )
}
