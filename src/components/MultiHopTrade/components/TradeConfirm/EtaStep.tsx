import { ArrowDownIcon } from '@chakra-ui/icons'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import { selectIsActiveQuoteMultiHop } from 'state/slices/tradeInputSlice/selectors'
import { selectFirstHop, selectLastHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { StepperStep } from '../MultiHopTradeConfirm/components/StepperStep'

const etaStepProps = { alignItems: 'center', py: 2 }

export const EtaStep = () => {
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const isMultiHopTrade = useAppSelector(selectIsActiveQuoteMultiHop)
  const totalEstimatedExecutionTimeMs = useMemo(() => {
    if (!tradeQuoteFirstHop || !tradeQuoteLastHop) return undefined
    if (!tradeQuoteFirstHop.estimatedExecutionTimeMs || !tradeQuoteLastHop.estimatedExecutionTimeMs)
      return undefined
    return isMultiHopTrade
      ? tradeQuoteFirstHop.estimatedExecutionTimeMs + tradeQuoteLastHop.estimatedExecutionTimeMs
      : tradeQuoteFirstHop.estimatedExecutionTimeMs
  }, [isMultiHopTrade, tradeQuoteFirstHop, tradeQuoteLastHop])

  const stepIndicator = useMemo(() => {
    return <ArrowDownIcon color='gray.500' boxSize={5} />
  }, [])
  const title = useMemo(() => {
    return totalEstimatedExecutionTimeMs
      ? `Estimated completion ${prettyMilliseconds(totalEstimatedExecutionTimeMs)}`
      : 'Estimated completion time unknown'
  }, [totalEstimatedExecutionTimeMs])
  return (
    <StepperStep
      title={title}
      stepIndicator={stepIndicator}
      stepProps={etaStepProps}
      useSpacer={false}
    />
  )
}
