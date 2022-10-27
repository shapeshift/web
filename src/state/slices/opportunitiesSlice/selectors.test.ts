import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'

import { foxEthPair } from './constants'
import { initialState } from './opportunitiesSlice'
import {
  selectAggregatedUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdIdByLpId,
  selectHighestBalanceAccountIdIdByStakingId,
  selectLpOpportunityIdsByAccountId,
  selectStakingOpportunityIdsByAccountId,
  selectUserStakingOpportunitiesByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'
import { serializeUserStakingId } from './utils'

const gomesAccountId = 'eip155:1:0xgomes'
const fauxmesAccountId = 'eip155:1:0xfauxmes'
const catpuccinoAccountId = 'eip155:1:0xcatpuccino'

describe('opportunitiesSlice selectors', () => {
  const baseState = {
    ...mockStore,
    opportunities: initialState,
  }
  describe('selects ID/s', () => {
    const accountBalances = {
      byId: {
        [gomesAccountId]: {
          'eip155:1:0xLpContractOne': '1337',
        },
        [fauxmesAccountId]: {
          'eip155:1:0xLpContractOne': '424242',
        },
      },
      ids: [gomesAccountId, 'eip155:1:fauxmes'],
    }
    const lp = {
      ...initialState.lp,
      byAccountId: {
        [gomesAccountId]: ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
        'eip155:1:fauxmes': ['eip155:1:0xLpContractOne'],
      },
      ids: ['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'],
    }
    const staking = {
      ...initialState.staking,
      byAccountId: {
        [gomesAccountId]: ['eip155:1:0xStakingContractOne', 'eip155:1:0xStakingContractTwo'],
        'eip155:1:fauxmes': ['eip155:1:0xStakingContractOne'],
      },
      ids: ['eip155:1:0xStakingContractOne', 'eip155:1:0xStakingContractTwo'],
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo'),
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne'),
        serializeUserStakingId(fauxmesAccountId, 'eip155:1:0xStakingContractOne'),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne')]: {
          stakedAmountCryptoPrecision: '4',
          rewardsAmountCryptoPrecision: '3',
        },
        [serializeUserStakingId(fauxmesAccountId, 'eip155:1:0xStakingContractOne')]: {
          stakedAmountCryptoPrecision: '9000',
          rewardsAmountCryptoPrecision: '1',
        },
      },
    }

    const mockState = {
      ...baseState,
      portfolio: {
        ...baseState.portfolio,
        accountBalances,
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

        expect(result).toEqual(['eip155:1:0xLpContractOne', 'eip155:1:0xLpContractTwo'])
      })
    })
    describe('selectStakingOpportunityIdsByAccountId', () => {
      it('can get staking opportunities Ids for a given AccountId', () => {
        const result = selectStakingOpportunityIdsByAccountId(mockState, {
          accountId: gomesAccountId,
        })

        expect(result).toEqual(['eip155:1:0xStakingContractOne', 'eip155:1:0xStakingContractTwo'])
      })
    })
    describe('selectHighestBalanceLpUserStakingIdByStakingId', () => {
      it('can get the highest balance AccuontId for a given StakingId', () => {
        const result = selectHighestBalanceAccountIdIdByStakingId(mockState, {
          stakingId: 'eip155:1:0xStakingContractOne',
        })

        expect(result).toEqual(fauxmesAccountId)
      })
    })
    describe('selectHighestBalanceAccountIdIdByLpId', () => {
      it('can get the highest balance AccountId for a given LpId', () => {
        const result = selectHighestBalanceAccountIdIdByLpId(mockState, {
          lpId: 'eip155:1:0xLpContractOne',
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
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo'),
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne'),
        serializeUserStakingId(fauxmesAccountId, 'eip155:1:0xStakingContractOne'),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne')]: {
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
          userStakingId: serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo'),
        }),
      ).toEqual({
        stakedAmountCryptoPrecision: '1337',
        rewardsAmountCryptoPrecision: '420',
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne'),
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
        'eip155:1:0xStakingContractTwo': {
          apy: '1000',
          assetId: 'eip155:1:0xStakingContractTwo',
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
        },
      },
    }
    const userStaking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo'),
        serializeUserStakingId(catpuccinoAccountId, 'eip155:1:0xStakingContractTwo'),
        serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne'),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo')]: {
          stakedAmountCryptoPrecision: '1337',
          rewardsAmountCryptoPrecision: '420',
        },
        [serializeUserStakingId(catpuccinoAccountId, 'eip155:1:0xStakingContractTwo')]: {
          stakedAmountCryptoPrecision: '100',
          rewardsAmountCryptoPrecision: '10',
        },
        [serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractOne')]: {
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
    describe('selectUserStakingOpportunitiesByStakingId', () => {
      it('can get the staking data for a given StakingId', () => {
        const result = selectUserStakingOpportunitiesByStakingId(mockState, {
          stakingId: 'eip155:1:0xStakingContractTwo',
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: 'eip155:1:0xStakingContractTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '420',
            stakedAmountCryptoPrecision: '1337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: serializeUserStakingId(gomesAccountId, 'eip155:1:0xStakingContractTwo'),
          },
          {
            apy: '1000',
            assetId: 'eip155:1:0xStakingContractTwo',
            provider: DefiProvider.FoxEthLP,
            rewardsAmountCryptoPrecision: '10',
            stakedAmountCryptoPrecision: '100',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
            userStakingId: serializeUserStakingId(
              catpuccinoAccountId,
              'eip155:1:0xStakingContractTwo',
            ),
          },
        ])
      })
    })
    describe('selectAggregatedUserStakingOpportunityByStakingId', () => {
      it('can get the aggregated staking opportunity for a given StakingId', () => {
        const result = selectAggregatedUserStakingOpportunityByStakingId(mockState, {
          stakingId: 'eip155:1:0xStakingContractTwo',
        })
        expect(result).toEqual({
          apy: '1000',
          assetId: 'eip155:1:0xStakingContractTwo',
          provider: DefiProvider.FoxEthLP,
          tvl: '91283233211',
          type: DefiType.LiquidityPool,
          underlyingAssetIds: foxEthPair,
          rewardsAmountCryptoPrecision: '430',
          stakedAmountCryptoPrecision: '1437',
        })
      })
    })
  })
})
