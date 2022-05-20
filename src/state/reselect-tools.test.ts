import { getStateWith, registerSelectors, selectorGraph } from 'reselect-tools'
import { store } from 'state/store'

import * as selectors from './slices/selectors'

describe('reselect-tools', () => {
  it('can load reselect tools', () => {
    /**
     * what the fuck is this you ask?
     * it ensures that changes made to selectors won't break reselect-tools
     * https://github.com/skortchmark9/reselect-tools
     *
     * if this test is failing, you've probably done one of the following
     * - used a non-selector function when composing a selector
     *   - --> make it a selector
     * - exported a non selector function from a selectors.ts file somewhere
     *   - --> move it to a utils file next to the selectors file
     */
    getStateWith(store.getState)
    registerSelectors(selectors)
    expect(() => selectorGraph()).not.toThrow()
  })
})
