import type { BridgeDefinition, CrossStep, Step } from '@lifi/sdk'
import { isCrossStep, isLifiStep } from '@lifi/types'
import { BigNumber, bn } from 'lib/bignumber/bignumber'
import { cryptoLifiToUsdHuman } from 'lib/swapper/LifiSwapper/utils/cryptoLifiToUsdHuman/cryptoLifiToUsdHuman'

const findMinimumTransferUsd = (
  crossStep: CrossStep,
  bridges: BridgeDefinition[],
): BigNumber | undefined => {
  const bridge = bridges.find(bridge => {
    return (
      bridge.fromToken.symbol === crossStep.action.fromToken.symbol &&
      bridge.toToken.symbol === crossStep.action.toToken.symbol &&
      bridge.fromChainId === crossStep.action.fromChainId &&
      bridge.toChainId === crossStep.action.toChainId &&
      bridge.tool === crossStep.tool
    )
  })

  if (bridge === undefined) {
    return
  }

  return cryptoLifiToUsdHuman(bn(bridge.minimumTransfer), bridge.fromToken)
}

export const getMinimumUsdHumanFromStep = (
  step: Step,
  lifiBridges: BridgeDefinition[],
): BigNumber | undefined => {
  const stepValues: (BigNumber | undefined)[] = []

  if (isLifiStep(step)) {
    for (const innerStep of step.includedSteps) {
      if (isCrossStep(innerStep)) {
        stepValues.push(findMinimumTransferUsd(innerStep, lifiBridges))
      }
    }
  }

  if (isCrossStep(step)) {
    stepValues.push(findMinimumTransferUsd(step, lifiBridges))
  }

  // exclude zero and undefined amounts
  const validValues = stepValues.filter((val): val is BigNumber => val !== undefined && val.gt(0))

  if (validValues.length === 0) return

  // take the highest specified value for the step so that if this step is chosen
  // the trade will meet the minimum amount
  return BigNumber.max(...validValues)
}
