import { forwardRef } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TransactionRow } from 'components/TransactionHistoryRows/TransactionRow'
import { type GlobalSearchResult, GlobalSearchResultType } from 'state/selectors/search-selectors'
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
    const handleClick = useCallback(
      () => onClick({ type: GlobalSearchResultType.Transaction, id: txId as TxId }),
      [onClick, txId],
    )
    return (
      <TransactionRow
        useCompactMode
        txId={txId}
        parentWidth={360}
        ref={ref}
        onClick={handleClick}
        aria-selected={selected ? true : undefined}
        disableCollapse
      />
    )
  },
)
