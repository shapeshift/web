import { Stack } from '@chakra-ui/react'
import { memo } from 'react'
import {
  selectActiveSwapperName,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { Hop } from './Hop'

export type HopsProps = {
  isFirstHopOpen: boolean
  isSecondHopOpen: boolean
  onToggleFirstHop?: () => void
  onToggleSecondHop?: () => void
}

export const Hops = memo((props: HopsProps) => {
  const { isFirstHopOpen, isSecondHopOpen, onToggleFirstHop, onToggleSecondHop } = props
  const swapperName = useAppSelector(selectActiveSwapperName)
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  if (!firstHop || !swapperName) return null

  return (
    <Stack spacing={6}>
      <Hop
        tradeQuoteStep={firstHop}
        swapperName={swapperName}
        hopIndex={0}
        isOpen={isFirstHopOpen}
        onToggleIsOpen={onToggleFirstHop}
      />
      {isMultiHopTrade && lastHop && (
        <Hop
          tradeQuoteStep={lastHop}
          swapperName={swapperName}
          hopIndex={1}
          isOpen={isSecondHopOpen}
          onToggleIsOpen={onToggleSecondHop}
        />
      )}
    </Stack>
  )
})
