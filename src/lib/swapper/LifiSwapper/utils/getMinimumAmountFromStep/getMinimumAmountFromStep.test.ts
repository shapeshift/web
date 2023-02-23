import type { Step } from '@lifi/sdk'
import type { LifiToolMeta } from 'lib/swapper/LifiSwapper/types'

import { getMinimumAmountFromStep } from './getMinimumAmountFromStep'

describe('getMinimumAmountFromStep', () => {
  it('handles 0 values in step', done => {
    // TODO:
    getMinimumAmountFromStep(
      null as unknown as Step,
      null as unknown as Map<string, Map<string, Map<string, LifiToolMeta>>>,
    )
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
