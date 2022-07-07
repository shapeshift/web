import { MOCK_VALIDATORS, SHAPESHIFT_OPPORTUNITY } from 'test/mocks/validators'
import { clearState, store } from 'state/store'

import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from './constants'
import { selectValidatorByAddress } from './selectors'
import { validatorData } from './validatorDataSlice'

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
            validators: MOCK_VALIDATORS,
          }),
        )
        expect(store.getState().validatorData.byValidator).toMatchSnapshot()
      })
    })

    describe('clear', () => {
      it('clears state back to initial state', async () => {
        store.dispatch(
          validatorData.actions.upsertValidatorData({
            validators: MOCK_VALIDATORS,
          }),
        )

        expect(
          store.getState().validatorData.byValidator[SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS],
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
    describe('selectValidatorByAddress', () => {
      it('returns null on initial state', async () => {
        const selected = selectValidatorByAddress(
          store.getState(),
          SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
        )
        expect(selected).toBeNull()
      })

      describe('validators are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: MOCK_VALIDATORS,
            }),
          )
        })

        it('returns null when validator data is not present in state', async () => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: MOCK_VALIDATORS,
            }),
          )

          const selected = selectValidatorByAddress(
            store.getState(),
            'cosmosvaloper1xxjvzwjpsf6ktuffkcpx29ut9qfrn0my8xdtqd',
          )
          expect(selected).toBeNull()
        })

        it('returns validator info when validator data is present in state', async () => {
          store.dispatch(
            validatorData.actions.upsertValidatorData({
              validators: MOCK_VALIDATORS,
            }),
          )

          const selected = selectValidatorByAddress(
            store.getState(),
            SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
          )
          expect(selected).toEqual(SHAPESHIFT_OPPORTUNITY)
        })
      })
    })
  })
})
