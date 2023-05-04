import { forwardRef } from '@chakra-ui/react'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import type { TxId } from 'state/slices/txHistorySlice/txHistorySlice'

type TxResultProps = {
  txId: TxId
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}
export const TxResult = forwardRef<TxResultProps, 'div'>(
  ({ txId, index, activeIndex, onClick }, ref) => {
    const selected = index === activeIndex
    return (
      <TransactionRow
        useCompactMode
        txId={txId}
        parentWidth={360}
        ref={ref}
        onClick={() => onClick({ type: GlobalSearchResultType.Transaction, id: txId as TxId })}
        aria-selected={selected ? true : undefined}
        disableCollapse
      />
    )
  },
)
