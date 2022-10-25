import { mockStore } from 'test/mocks/store'

import type { UserStakingId } from './opportunitiesSlice'
import { initialState } from './opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'

describe('opportunitiesSlice selectors', () => {
  const baseState = {
    ...mockStore,
    opportunities: initialState,
  }
  describe('selectLpOpportunityIdsByAccountId', () => {
    it('can get LP opportunities Ids for a given AccountId', () => {
      const lp = {
        ...initialState.lp,
        byAccountId: {
          'eip155:1:0xgomes': ['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'],
        },
      }
      const mockState = {
        ...baseState,
        opportunities: {
          ...initialState,
          lp,
        },
      }

      const result = selectLpOpportunityIdsByAccountId(mockState, { accountId: 'eip155:1:0xgomes' })

      expect(result).toEqual(['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'])
    })
  })
  describe('selectStakingOpportunityIdsByAccountId', () => {
    it('can get staking opportunities Ids for a given AccountId', () => {
      const staking = {
        ...initialState.staking,
        byAccountId: {
          'eip155:1:0xgomes': ['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'],
        },
      }
      const mockState = {
        ...baseState,
        opportunities: {
          ...initialState,
          staking,
        },
      }

      const result = selectStakingOpportunityIdsByAccountId(mockState, {
        accountId: 'eip155:1:0xgomes',
      })

      expect(result).toEqual(['eip155:1:0xLpOne', 'eip155:1:0xLpTwo'])
    })
  })
  describe('selectUserStakingOpportunityByUserStakingId', () => {
    const staking = {
      ...initialState.staking,
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        'eip155:1:0xgomes*eip155:1:0xLpTwo',
        'eip155:1:0xgomes*eip155:1:0xLpOne',
        'eip155:1:0xfauxmes*eip155:1:0xLpOne',
      ] as UserStakingId[],
      byId: {
        'eip155:1:0xgomes*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        'eip155:1:0xgomes*eip155:1:0xLpOne': {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the staking data for a given UserStakingId', () => {
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: 'eip155:1:0xgomes*eip155:1:0xLpTwo',
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '1337',
        rewardsAmountCryptoPrecision: '420',
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: 'eip155:1:0xgomes*eip155:1:0xLpOne',
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '4',
        rewardsAmountCryptoPrecision: '3',
      })
    })
  })
  describe('selectUserStakingOpportunitiesByStakingId', () => {
    const staking = {
      ...initialState.staking,
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        'eip155:1:0xgomes*eip155:1:0xLpTwo',
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo',
        'eip155:1:0xgomes*eip155:1:0xLpOne',
      ] as UserStakingId[],
      byId: {
        'eip155:1:0xgomes*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        'eip155:1:0xgomes*eip155:1:0xLpOne': {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the staking data for a given StakingId', () => {
      const result = selectUserStakingOpportunitiesByStakingId(mockState, {
        stakingId: 'eip155:1:0xLpTwo',
      })
      expect(result).toEqual([
        {
          rewardsAmountCryptoPrecision: '420',
          stakedAmountCryptoPrecision: '1337',
        },
        {
          rewardsAmountCryptoPrecision: '10',
          stakedAmountCryptoPrecision: '100',
        },
      ])
    })
  })
  describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
    const staking = {
      ...initialState.staking,
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        'eip155:1:0xgomes*eip155:1:0xLpTwo',
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo',
        'eip155:1:0xgomes*eip155:1:0xLpOne',
      ] as UserStakingId[],
      byId: {
        'eip155:1:0xgomes*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        'eip155:1:0xcatpuccino*eip155:1:0xLpTwo': {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        'eip155:1:0xgomes*eip155:1:0xLpOne': {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
      },
    }

    const mockState = {
      ...baseState,
      opportunities: {
        ...initialState,
        staking,
        userStaking,
      },
    }

    it('can get the aggregated staking opportunity for a given StakingId', () => {
      const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
        stakingId: 'eip155:1:0xLpTwo',
      })
      expect(result).toEqual({
        rewardsAmountCryptoPrecision: '430',
        stakedAmountCryptoPrecision: '1437',
      })
    })
  })
})
