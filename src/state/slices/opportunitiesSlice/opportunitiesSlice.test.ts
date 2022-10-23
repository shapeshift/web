import { clearState, store } from 'state/store'

import { initialState } from './opportunitiesSlice'

describe('opportunitiesSlice', () => {
  beforeEach(() => {
    clearState()
  })

  it('returns uninitialized properties for initialState', async () => {
    expect(store.getState().opportunities).toEqual(initialState)
  })

  describe('reducers', () => {
    describe('clear', () => {
      it.todo('clears state back to initial state')
    })
  })

  describe('selectors', () => {
    // TODO
  })
})
