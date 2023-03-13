import type { BridgeDefinition as LifiBridgeDefinition, Route as LifiRoute } from '@lifi/sdk'
import { BigNumber } from 'lib/bignumber/bignumber'
import { getMinimumAmountFromStep } from 'lib/swapper/LifiSwapper/utils/getMinimumAmountFromStep/getMinimumAmountFromStep'

export const getMinimumAmountFromRoutes = (
  lifiRoutes: LifiRoute[],
  lifiBridges: LifiBridgeDefinition[],
): BigNumber | undefined => {
  const candidateValues: BigNumber[] = []

  for (const route of lifiRoutes) {
    const routeValues: BigNumber[] = route.steps
      .map(step => getMinimumAmountFromStep(step, lifiBridges))
      .filter((value): value is BigNumber => value !== undefined)

    if (routeValues.length === 0) continue

    // take the highest specified value for the route so that if this route is chosen
    // the trade will meet the minimum amount for all steps in the entire route
    candidateValues.push(BigNumber.max(...routeValues))
  }

  if (candidateValues.length === 0) return

  return BigNumber.min(...candidateValues)
}
