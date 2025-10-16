import { ArrowDownIcon } from '@chakra-ui/icons'
import prettyMilliseconds from 'pretty-ms'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StepperStep } from '../StepperStep'

import { selectActiveQuote } from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'

const etaStepProps = { py: 0 }

export const EtaStep = () => {
  const translate = useTranslate()
  const activeQuote = useAppSelector(selectActiveQuote)
  const totalEstimatedExecutionTimeMs = useMemo(
    () =>
      activeQuote?.steps.reduce((acc, step) => {
        return acc + (step.estimatedExecutionTimeMs ?? 0)
      }, 0),
    [activeQuote?.steps],
  )
  const swapperName = activeQuote?.steps[0].source

  const stepIndicator = useMemo(() => {
    return <ArrowDownIcon color='gray.500' boxSize={5} />
  }, [])
  const title = useMemo(() => {
    return totalEstimatedExecutionTimeMs !== undefined
      ? translate('trade.hopTitle.swapEta', {
          swapperName,
          eta: prettyMilliseconds(totalEstimatedExecutionTimeMs),
        })
      : translate('trade.hopTitle.swap', { swapperName })
  }, [totalEstimatedExecutionTimeMs, swapperName, translate])
  return (
    <StepperStep
      title={title}
      stepIndicator={stepIndicator}
      stepProps={etaStepProps}
      useSpacer={false}
    />
  )
}
