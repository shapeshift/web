import type { Step } from '@lifi/sdk'
import { isCrossStep, isLifiStep } from '@lifi/sdk'
import { BigNumber } from 'lib/bignumber/bignumber'
import type { LifiToolMeta } from 'lib/swapper/LifiSwapper/types'

export const getMinimumAmountFromStep = (
  step: Step,
  lifiToolMap: Map<string, Map<string, Map<string, LifiToolMeta>>>,
): BigNumber | undefined => {
  const stepValues: (BigNumber | undefined)[] = []

  if (isLifiStep(step)) {
    for (const innerStep of step.includedSteps) {
      if (isCrossStep(innerStep)) {
        const tool = innerStep.tool
        const toolMetadata = lifiToolMap
          .get(innerStep.action.fromToken.symbol)
          ?.get(innerStep.action.toToken.symbol)
          ?.get(tool)

        stepValues.push(toolMetadata?.minimumTransfer)
      }
    }
  }

  if (isCrossStep(step)) {
    const tool = step.tool
    const toolMetadata = lifiToolMap
      .get(step.action.fromToken.symbol)
      ?.get(step.action.toToken.symbol)
      ?.get(tool)

    stepValues.push(toolMetadata?.minimumTransfer)
  }

  // exclude zero and undefined amounts
  const validValues = stepValues.filter((val): val is BigNumber => val !== undefined && val.gt(0))

  if (validValues.length === 0) return

  // take the highest specified value for the step so that if this step is chosen
  // the trade will meet the minimum amount
  return BigNumber.max(...validValues)
}
