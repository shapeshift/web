import type { BridgeDefinition as LifiBridgeDefinition, Step as LifiStep } from '@lifi/sdk'

import { getMinimumAmountFromStep } from './getMinimumAmountFromStep'

describe('getMinimumAmountFromStep', () => {
  it('handles 0 values in step', done => {
    // TODO:
    getMinimumAmountFromStep(null as unknown as LifiStep, null as unknown as LifiBridgeDefinition[])
    done.fail()
  })

  it('handles 0 values in includedSteps', done => {
    // TODO:
    done.fail()
  })

  it("only aggregates steps of type 'cross'", done => {
    // TODO:
    done.fail()
  })
})
