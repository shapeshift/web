import { Box, Stack } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import {
  selectActiveSwapperName,
  selectConfirmedQuote,
  selectFirstHop,
  selectIsActiveQuoteMultiHop,
  selectLastHop,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { Hop } from './Hop'

export type HopsProps = {
  initialActiveTradeId: string
  isFirstHopOpen: boolean
  isSecondHopOpen: boolean
  onToggleFirstHop?: () => void
  onToggleSecondHop?: () => void
}

export const Hops = memo((props: HopsProps) => {
  const {
    initialActiveTradeId,
    isFirstHopOpen,
    isSecondHopOpen,
    onToggleFirstHop,
    onToggleSecondHop,
  } = props
  const swapperName = useAppSelector(selectActiveSwapperName)
  const firstHop = useAppSelector(selectFirstHop)
  const lastHop = useAppSelector(selectLastHop)
  const confirmedQuote = useAppSelector(selectConfirmedQuote)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)

  const divider = useMemo(
    () => <Box height={2} borderColor='border.bold' bg='background.surface.base' />,
    [],
  )

  if (!confirmedQuote || !firstHop || !swapperName) return null

  const activeTradeId = confirmedQuote.id

  return (
    <Stack spacing={0} divider={divider} borderColor='border.base'>
      <Hop
        tradeQuoteStep={firstHop}
        swapperName={swapperName}
        hopIndex={0}
        isOpen={isFirstHopOpen}
        onToggleIsOpen={onToggleFirstHop}
        slippageTolerancePercentageDecimal={confirmedQuote.slippageTolerancePercentageDecimal}
        activeTradeId={activeTradeId}
        initialActiveTradeId={initialActiveTradeId}
      />
      {isMultiHopTrade && lastHop && (
        <Hop
          tradeQuoteStep={lastHop}
          swapperName={swapperName}
          hopIndex={1}
          isOpen={isSecondHopOpen}
          onToggleIsOpen={onToggleSecondHop}
          slippageTolerancePercentageDecimal={confirmedQuote.slippageTolerancePercentageDecimal}
          activeTradeId={activeTradeId}
          initialActiveTradeId={initialActiveTradeId}
        />
      )}
    </Stack>
  )
})
