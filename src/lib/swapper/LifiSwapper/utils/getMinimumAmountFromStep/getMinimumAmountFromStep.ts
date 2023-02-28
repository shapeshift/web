import type { BridgeDefinition, CrossStep, LifiStep, Step } from '@lifi/sdk'
import { isCrossStep, isLifiStep } from '@lifi/sdk'
import { bn } from '@shapeshiftoss/investor-foxy'
import { BigNumber } from 'lib/bignumber/bignumber'

const findMinimumTransfer = (
  lifiStep: LifiStep | CrossStep,
  crossStep: CrossStep,
  bridges: BridgeDefinition[],
): BigNumber | undefined => {
  const bridge = bridges.find(bridge => {
    return (
      bridge.fromToken.symbol === lifiStep.action.fromToken.symbol &&
      bridge.toToken.symbol === lifiStep.action.toToken.symbol &&
      bridge.fromChainId === lifiStep.action.fromChainId &&
      bridge.toChainId === lifiStep.action.toChainId &&
      bridge.tool === crossStep.tool
    )
  })

  if (bridge === undefined) return

  return bn(bridge.minimumTransfer)
}

export const getMinimumAmountFromStep = (
  step: Step,
  lifiBridges: BridgeDefinition[],
): BigNumber | undefined => {
  const stepValues: (BigNumber | undefined)[] = []

  if (isLifiStep(step)) {
    for (const innerStep of step.includedSteps) {
      if (isCrossStep(innerStep)) {
        stepValues.push(findMinimumTransfer(step, innerStep, lifiBridges))
      }
    }
  }

  if (isCrossStep(step)) {
    stepValues.push(findMinimumTransfer(step, step, lifiBridges))
  }

  // exclude zero and undefined amounts
  const validValues = stepValues.filter((val): val is BigNumber => val !== undefined && val.gt(0))

  if (validValues.length === 0) return

  // take the highest specified value for the step so that if this step is chosen
  // the trade will meet the minimum amount
  return BigNumber.max(...validValues)
}
