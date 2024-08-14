import { Box, Stack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  selectActiveQuote,
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
  const activeQuote = useAppSelector(selectActiveQuote)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  const divider = useMemo(
    () => <Box height={2} borderColor='border.bold' bg='background.surface.base' />,
    [],
  )

  if (!activeQuote || !firstHop || !swapperName) return null

  const tradeId = activeQuote.id

  return (
    <Stack spacing={0} divider={divider} borderColor='border.base'>
      <Hop
        tradeQuoteStep={firstHop}
        swapperName={swapperName}
        hopIndex={0}
        isOpen={isFirstHopOpen}
        onToggleIsOpen={onToggleFirstHop}
        slippageTolerancePercentageDecimal={activeQuote.slippageTolerancePercentageDecimal}
        tradeId={tradeId}
      />
      {isMultiHopTrade && lastHop && (
        <Hop
          tradeQuoteStep={lastHop}
          swapperName={swapperName}
          hopIndex={1}
          isOpen={isSecondHopOpen}
          onToggleIsOpen={onToggleSecondHop}
          slippageTolerancePercentageDecimal={activeQuote.slippageTolerancePercentageDecimal}
          tradeId={tradeId}
        />
      )}
    </Stack>
  )
})
