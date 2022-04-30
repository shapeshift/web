import { clearState, store } from 'state/store'

import { selectSingleValidator } from './selectors'
import { validatorData } from './validatorDataSlice'

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
const SHAPESHIFT_OPPORTUNITY = {
  address: SHAPESHIFT_VALIDATOR_ADDRESS,
  moniker: 'Shapeshift DAO',
  tokens: '111111',
  apr: '0.24',
  commission: '0.100000000000000000',
}

describe('validatorDataSlice', () => {
  beforeEach(() => {
    clearState()
  })

  it('returns uninitialized properties for initialState', async () => {
    expect(store.getState().validatorData).toEqual({
      byValidator: {},
      validatorIds: [],
    })
  })

  describe('reducers', () => {
    describe('upsertValidatorData', () => {
      it('updates or inserts validator data in state', async () => {
        store.dispatch(
          validatorData.actions.upsertValidatorData({
            validators: [],
          }),
        )
        expect(store.getState().validatorData.byValidator).toMatchSnapshot()
      })
    })

    describe('clear', () => {
      it('clears state back to initial state', async () => {
        store.dispatch(
          validatorData.actions.upsertValidatorData({
            validators: [],
          }),
        )

        expect(
          store.getState().validatorData.byValidator[SHAPESHIFT_VALIDATOR_ADDRESS],
        ).toMatchSnapshot()
        expect(store.getState().validatorData.byValidator).toMatchSnapshot()
        store.dispatch(validatorData.actions.clear())

        expect(store.getState().validatorData).toEqual({
          byValidator: {},
          validatorIds: [],
        })
      })
    })
  })

  describe('selectors', () => {
    describe('selectSingleValidator', () => {
      it('returns null on initial state', async () => {
        const selected = selectSingleValidator(store.getState(), SHAPESHIFT_VALIDATOR_ADDRESS)
        expect(selected).toBeNull()
      })

      describe('validators are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: [],
            }),
          )
        })

        it('returns null when validator data is not present in state', async () => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: [SHAPESHIFT_OPPORTUNITY],
            }),
          )

          const selected = selectSingleValidator(
            store.getState(),
            'cosmosvaloper1xxjvzwjpsf6ktuffkcpx29ut9qfrn0my8xdtqd',
          )
          expect(selected).toBeNull()
        })

        it('returns validator info when validator data is present in state', async () => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: [SHAPESHIFT_OPPORTUNITY],
            }),
          )

          const selected = selectSingleValidator(store.getState(), SHAPESHIFT_VALIDATOR_ADDRESS)
          expect(selected).toEqual(SHAPESHIFT_OPPORTUNITY)
        })
      })
    })
  })
})
