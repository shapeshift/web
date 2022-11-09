import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'

import { foxEthPair } from './constants'
import {
  catpuccinoAccountId,
  fauxmesAccountId,
  gomesAccountId,
  mockLpContractOne,
  mockLpContractTwo,
  mockStakingContractOne,
  mockStakingContractTwo,
} from './mocks'
import { initialState } from './opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'
import { serializeUserStakingId } from './utils'

describe('opportunitiesSlice selectors', () => {
  const mockBaseState = {
    ...mockStore,
    opportunities: initialState,
  }
  describe('selects ID/s', () => {
    const accountMetadata = {
      byId: {},
      ids: [gomesAccountId, fauxmesAccountId],
    }
    const accountBalances = {
      byId: {
        [gomesAccountId]: {
          [mockLpContractOne]: '1337',
        },
        [fauxmesAccountId]: {
          [mockLpContractOne]: '424242',
        },
      },
      ids: [gomesAccountId, fauxmesAccountId],
    }
    const lp = {
      ...initialState.lp,
      byAccountId: {
        [gomesAccountId]: [mockLpContractOne, mockLpContractTwo],
        [fauxmesAccountId]: [mockLpContractOne],
      },
      ids: [mockLpContractOne, mockLpContractTwo],
    }
    const staking = {
      ...initialState.staking,
      byAccountId: {
        [gomesAccountId]: [mockStakingContractOne, mockStakingContractTwo],
        [fauxmesAccountId]: [mockStakingContractOne],
      },
      ids: [mockStakingContractOne, mockStakingContractTwo],
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
        [serializeUserStakingId(fauxmesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoPrecision: '9000',
          rewardsAmountCryptoPrecision: '1',
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      portfolio: {
        ...mockBaseState.portfolio,
        accountBalances,
        accountMetadata,
      },
      opportunities: {
        ...initialState,
        lp,
        staking,
        userStaking,
      },
    }
    describe('selectLpOpportunityIdsByAccountId', () => {
      it('can get LP opportunities Ids for a given AccountId', () => {
        const result = selectLpOpportunityIdsByAccountId(mockState, {
          accountId: gomesAccountId,
        })

        expect(result).toEqual([mockLpContractOne, mockLpContractTwo])
      })
    })
    describe('selectStakingOpportunityIdsByAccountId', () => {
      it('can get staking opportunities Ids for a given AccountId', () => {
        const result = selectStakingOpportunityIdsByAccountId(mockState, {
          accountId: gomesAccountId,
        })

        expect(result).toEqual([mockStakingContractOne, mockStakingContractTwo])
      })
    })
    describe('selectHighestBalanceLpUserStakingIdByStakingId', () => {
      it('can get the highest balance AccountId for a given StakingId', () => {
        const result = selectHighestBalanceAccountIdByStakingId(mockState, {
          stakingId: mockStakingContractOne,
        })

        expect(result).toEqual(fauxmesAccountId)
      })
    })
    describe('selectHighestBalanceAccountIdByLpId', () => {
      it('can get the highest balance AccountId for a given LpId', () => {
        const result = selectHighestBalanceAccountIdByLpId(mockState, {
          lpId: mockLpContractOne,
        })

        expect(result).toEqual(fauxmesAccountId)
      })
    })
  })
  describe('selectUserStakingOpportunityByUserStakingId', () => {
    const staking = {
      ...initialState.staking,
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the staking data for a given UserStakingId', () => {
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '1337',
        rewardsAmountCryptoPrecision: '420',
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '4',
        rewardsAmountCryptoPrecision: '3',
      })
    })
  })
  describe('selects many opportunities', () => {
    const staking = {
      ...initialState.staking,
      byId: {
        [mockStakingContractTwo]: {
          apy: '1000',
          assetId: mockStakingContractTwo,
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
          underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [string, string],
        },
      },
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...mockBaseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }
    describe('selectUserStakingOpportunitiesByStakingId', () => {
      it('can get the staking data for a given StakingId', () => {
        const result = selectUserStakingOpportunitiesByStakingId(mockState, {
          stakingId: mockStakingContractTwo,
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: mockStakingContractTwo,
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '420',
            stakedAmountCryptoPrecision: '1337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [
              string,
              string,
            ],
            userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
          },
          {
            apy: '1000',
            assetId: mockStakingContractTwo,
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '10',
            stakedAmountCryptoPrecision: '100',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [
              string,
              string,
            ],
            userStakingId: serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo),
          },
        ])
      })
    })
    describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
      it('can get the aggregated staking opportunity for a given StakingId', () => {
        const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
          stakingId: mockStakingContractTwo,
        })
        expect(result).toEqual({
          apy: '1000',
          assetId: mockStakingContractTwo,
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
          underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [string, string],
          rewardsAmountCryptoPrecision: '430',
          stakedAmountCryptoPrecision: '1437',
        })
      })
    })
  })
})
