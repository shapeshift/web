import {
  emptyMockStakingData,
  mockStakingData,
  mockStakingDataWithOnlyRewards,
  mockStakingDataWithOnlyUndelegations,
  mockStakingWithUnknownValidators,
  mockValidatorData,
} from 'test/mocks/stakingData'
import { clearState, store } from 'state/store'

import {
  selectActiveStakingOpportunityDataByAssetId,
  selectNonloadedValidators,
  selectRewardsAmountByAssetId,
  selectStakingDataIsLoaded,
  selectTotalBondingsBalanceByAssetId,
  selectTotalStakingDelegationCryptoByAccountSpecifier,
  selectValidatorByAddress,
  selectValidatorIsLoaded,
} from './selectors'
import { stakingData } from './stakingDataSlice'

const cosmosAccountSpecifier: string =
  'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669'
const otherCosmosAccountSpecifier: string =
  'cosmos:cosmoshub-4:cosmos1j26n3mjpwx4f7zz65tzq3mygcr74wp7kcwcner'
const cosmosAssetId = 'cosmos:cosmoshub-4/slip44:118'
const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

describe('stakingDataSlice', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => void 0)
  beforeEach(() => {
    clearState()
  })
  afterAll(() => consoleInfoSpy.mockRestore())

  it('returns uninitialized properties for initialState', async () => {
    expect(store.getState().stakingData).toEqual({
      byAccountSpecifier: {},
      byValidator: {},
      status: 'idle',
      validatorStatus: 'idle',
    })
  })

  describe('reducers', () => {
    describe('setStatus', () => {
      it('updates status in state', async () => {
        store.dispatch(stakingData.actions.setStatus('loading'))
        expect(store.getState().stakingData.status).toEqual('loading')
        expect(store.getState().stakingData.validatorStatus).toEqual('idle')

        store.dispatch(stakingData.actions.setStatus('loaded'))
        expect(store.getState().stakingData.status).toEqual('loaded')
        expect(store.getState().stakingData.validatorStatus).toEqual('idle')

        store.dispatch(stakingData.actions.setStatus('idle'))
        expect(store.getState().stakingData.status).toEqual('idle')
        expect(store.getState().stakingData.validatorStatus).toEqual('idle')
      })
    })

    describe('setValidatorStatus', () => {
      it('updates validator status in state', async () => {
        store.dispatch(stakingData.actions.setValidatorStatus('loading'))
        expect(store.getState().stakingData.status).toEqual('idle')
        expect(store.getState().stakingData.validatorStatus).toEqual('loading')

        store.dispatch(stakingData.actions.setValidatorStatus('loaded'))
        expect(store.getState().stakingData.status).toEqual('idle')
        expect(store.getState().stakingData.validatorStatus).toEqual('loaded')

        store.dispatch(stakingData.actions.setValidatorStatus('idle'))
        expect(store.getState().stakingData.status).toEqual('idle')
        expect(store.getState().stakingData.validatorStatus).toEqual('idle')
      })
    })

    describe('upsertStakingData', () => {
      it('updates or inserts staking data in state', async () => {
        store.dispatch(
          stakingData.actions.upsertStakingData({
            accountSpecifier: cosmosAccountSpecifier,
            stakingData: mockStakingData,
          }),
        )
        expect(
          store.getState().stakingData.byAccountSpecifier[cosmosAccountSpecifier],
        ).toMatchSnapshot()
        expect(
          store.getState().stakingData.byAccountSpecifier[otherCosmosAccountSpecifier],
        ).toBeUndefined()
      })

      it('updates or inserts empty staking data in state', async () => {
        store.dispatch(
          stakingData.actions.upsertStakingData({
            accountSpecifier: otherCosmosAccountSpecifier,
            stakingData: emptyMockStakingData,
          }),
        )
        expect(
          store.getState().stakingData.byAccountSpecifier[otherCosmosAccountSpecifier],
        ).toMatchSnapshot()
        expect(
          store.getState().stakingData.byAccountSpecifier[cosmosAccountSpecifier],
        ).toBeUndefined()
      })
    })

    describe('upsertValidatorData', () => {
      it('updates or inserts validator data in state', async () => {
        store.dispatch(
          stakingData.actions.upsertValidatorData({
            validators: mockValidatorData,
          }),
        )
        expect(store.getState().stakingData.byValidator).toMatchSnapshot()
      })
    })

    describe('clear', () => {
      it('clears state back to initial state', async () => {
        store.dispatch(stakingData.actions.setStatus('loaded'))
        store.dispatch(stakingData.actions.setValidatorStatus('loaded'))
        store.dispatch(
          stakingData.actions.upsertStakingData({
            accountSpecifier: cosmosAccountSpecifier,
            stakingData: mockStakingData,
          }),
        )
        store.dispatch(
          stakingData.actions.upsertValidatorData({
            validators: mockValidatorData,
          }),
        )

        expect(
          store.getState().stakingData.byAccountSpecifier[cosmosAccountSpecifier],
        ).toMatchSnapshot()
        expect(store.getState().stakingData.byValidator).toMatchSnapshot()
        store.dispatch(stakingData.actions.clear())

        expect(store.getState().stakingData).toEqual({
          byAccountSpecifier: {},
          byValidator: {},
          status: 'idle',
          validatorStatus: 'idle',
        })
      })
    })
  })

  describe('selectors', () => {
    describe('selectActiveStakingOpportunityDataByAssetId', () => {
      it('returns empty array on initial state', async () => {
        const selected = selectActiveStakingOpportunityDataByAssetId(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
          assetId: cosmosAssetId,
        })
        expect(selected).toEqual([])
      })

      it('returns empty array when staking data is loaded but validators are not', async () => {
        store.dispatch(
          stakingData.actions.upsertStakingData({
            accountSpecifier: cosmosAccountSpecifier,
            stakingData: mockStakingData,
          }),
        )

        const selected = selectActiveStakingOpportunityDataByAssetId(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
          assetId: cosmosAssetId,
        })
        expect(selected).toEqual([])
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
        })

        it('returns correct array with delegations, undelegations, redelegations and rewards', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )

          const selected = selectActiveStakingOpportunityDataByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            assetId: cosmosAssetId,
          })
          expect(selected).toMatchSnapshot()
        })

        it('returns correct array with only undelegations', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingDataWithOnlyUndelegations,
            }),
          )

          const selected = selectActiveStakingOpportunityDataByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            assetId: cosmosAssetId,
          })
          expect(selected).toMatchSnapshot()
        })

        it('returns correct array with only rewards', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingDataWithOnlyRewards,
            }),
          )

          const selected = selectActiveStakingOpportunityDataByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            assetId: cosmosAssetId,
          })
          expect(selected).toMatchSnapshot()
        })
      })
    })

    describe('selectNonloadedValidators', () => {
      it('returns empty array on initial state', async () => {
        const selected = selectNonloadedValidators(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(selected).toEqual([])
      })

      it('returns all validators in staking data when staking data is loaded but validators are not', async () => {
        store.dispatch(
          stakingData.actions.upsertStakingData({
            accountSpecifier: cosmosAccountSpecifier,
            stakingData: mockStakingData,
          }),
        )

        const selected = selectNonloadedValidators(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(selected).toEqual([
          'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
          'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
          'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
        ])
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
        })

        it('returns empty array when all validators in stakingData are loaded / known', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )

          const selected = selectNonloadedValidators(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
          })
          expect(selected).toEqual([])
        })

        it('returns correct array when some validators in stakingData are not loaded / unknown', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingWithUnknownValidators,
            }),
          )

          const selected = selectNonloadedValidators(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
          })
          expect(selected).toEqual([
            'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
            'cosmosvaloper1yvwqd5rdtuaw25mcqhz794dvgq9k9yeh8mjcdh',
          ])
        })
      })
    })

    describe('selectValidatorByAddress', () => {
      it('returns null on initial state', async () => {
        const selected = selectValidatorByAddress(store.getState(), {
          validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
        })
        expect(selected).toBeNull()
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
        })

        it('returns null when validator data is not present in state', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )

          const selected = selectValidatorByAddress(store.getState(), {
            validatorAddress: 'cosmosvaloper1xxjvzwjpsf6ktuffkcpx29ut9qfrn0my8xdtqd',
          })
          expect(selected).toBeNull()
        })

        it('returns validator info when validator data is present in state', async () => {
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )

          const selected = selectValidatorByAddress(store.getState(), {
            validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
          })
          expect(selected).toEqual({
            address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
            tokens: '111116',
            apr: '0.1496681491',
            commission: '0.100000000000000000',
            moniker: 'ShapeShift DAO',
          })
        })
      })
    })

    describe('selectRewardsAmountByAssetId', () => {
      it('returns empty string on initial state', async () => {
        const selected = selectRewardsAmountByAssetId(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
          validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
          assetId: cosmosAssetId,
        })
        expect(selected).toEqual('')
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )
        })

        it('returns empty string when there is no reward data', async () => {
          const selected = selectRewardsAmountByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            validatorAddress: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
            assetId: cosmosAssetId,
          })
          expect(selected).toEqual('')

          const selected2 = selectRewardsAmountByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            validatorAddress: 'cosmosvaloper1r9lxkpqre6j4487ut882xchgr7rdtx3x76gtdp',
            assetId: cosmosAssetId,
          })
          expect(selected2).toEqual('')
        })

        it('returns the reward amount when there is a reward', async () => {
          const selected = selectRewardsAmountByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
            assetId: cosmosAssetId,
          })
          expect(selected).toEqual('3.831752143667562385')
        })
      })
    })

    describe('selectTotalBondingsBalanceByAssetId', () => {
      it("returns '0' on initial state", async () => {
        const selected = selectTotalBondingsBalanceByAssetId(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
          validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
          assetId: cosmosAssetId,
        })
        expect(selected).toEqual('0')
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )
        })

        it('returns the reward amount when there is a reward', async () => {
          const selected = selectTotalBondingsBalanceByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
            assetId: cosmosAssetId,
          })
          expect(selected).toEqual('10115')

          const selected2 = selectTotalBondingsBalanceByAssetId(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
            validatorAddress: 'cosmosvaloper1qtxec3ggeuwnca9mmngw7vf6ctw54cppey02fs',
            assetId: cosmosAssetId,
          })
          expect(selected2).toEqual('4')
        })
      })
    })

    describe('selectTotalStakingDelegationCryptoByAccountSpecifier', () => {
      it('returns 0 on initial state', async () => {
        const selected = selectTotalStakingDelegationCryptoByAccountSpecifier(store.getState(), {
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(selected).toEqual('0')
      })

      describe('validators and staking data are loaded', () => {
        beforeEach(() => {
          store.dispatch(
            stakingData.actions.upsertValidatorData({
              validators: mockValidatorData,
            }),
          )
          store.dispatch(
            stakingData.actions.upsertStakingData({
              accountSpecifier: cosmosAccountSpecifier,
              stakingData: mockStakingData,
            }),
          )
        })

        it('returns the total staking delegations amount for the account specifier', async () => {
          const selected = selectTotalStakingDelegationCryptoByAccountSpecifier(store.getState(), {
            accountSpecifier: cosmosAccountSpecifier,
          })
          expect(selected).toEqual('15019')
        })
      })
    })
  })

  describe('selectStakingDataIsLoaded and selectValidatorIsLoaded', () => {
    it('returns false when nothing is loaded', async () => {
      const selected = selectStakingDataIsLoaded(store.getState())
      const selected2 = selectValidatorIsLoaded(store.getState())
      expect(selected).toBeFalsy()
      expect(selected2).toBeFalsy()
    })

    it('returns false when data is loading', async () => {
      store.dispatch(stakingData.actions.setStatus('loading'))
      const selected = selectStakingDataIsLoaded(store.getState())
      expect(selected).toBeFalsy()

      store.dispatch(stakingData.actions.setValidatorStatus('loading'))
      const selected2 = selectValidatorIsLoaded(store.getState())
      expect(selected2).toBeFalsy()
    })

    it('returns true when data is loaded', async () => {
      store.dispatch(stakingData.actions.setStatus('loaded'))
      const selected = selectStakingDataIsLoaded(store.getState())
      expect(selected).toBeTruthy()

      store.dispatch(stakingData.actions.setValidatorStatus('loaded'))
      const selected2 = selectValidatorIsLoaded(store.getState())
      expect(selected2).toBeTruthy()
    })
  })
})
