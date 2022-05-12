import merge from 'lodash/merge'
import { clearState, store } from 'state/store'

import { selectValidatorByAddress } from './selectors'
import { validatorData } from './validatorDataSlice'

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
const SHAPESHIFT_OPPORTUNITY = {
  address: SHAPESHIFT_VALIDATOR_ADDRESS,
  moniker: 'Shapeshift DAO',
  tokens: '111111',
  apr: '0.24',
  commission: '0.100000000000000000',
}

const MOCK_VALIDATORS = merge(
  [
    {
      address: 'cosmosvaloper19ggkjc5slg5gphf92yrvusr3jc702h4tfz6nvn',
      moniker: 'IZ*ONE',
      tokens: '60102',
      commission: '0.040000000000000000',
      apr: '0.1631159915',
    },
    {
      address: 'cosmosvaloper19f0w9svr905fhefusyx4z8sf83j6et0g9l5yhl',
      moniker: 'NodeStake.top',
      tokens: '1366570093',
      commission: '0.010000000000000000',
      apr: '0.1682133662',
    },
    {
      address: 'cosmosvaloper1xhhquwctvwm40qn3nmmqq067pc2gw22eqkwgt0',
      moniker: 'stake2earn',
      tokens: '4474530413',
      commission: '0.010000000000000000',
      apr: '0.1682133662',
    },
  ],
  [SHAPESHIFT_OPPORTUNITY],
)
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
    describe('selectValidatorByAddress', () => {
      it('returns null on initial state', async () => {
        const selected = selectValidatorByAddress(store.getState(), SHAPESHIFT_VALIDATOR_ADDRESS)
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

          const selected = selectValidatorByAddress(store.getState(), SHAPESHIFT_VALIDATOR_ADDRESS)
          expect(selected).toEqual(SHAPESHIFT_OPPORTUNITY)
        })
      })
    })
  })
})
