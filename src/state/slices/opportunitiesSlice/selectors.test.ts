import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { mockStore } from 'test/mocks/store'
import type { OpportunityMetadata } from 'state/slices/opportunitiesSlice/types'

import { foxEthLpAssetId, foxEthPair } from './constants'
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
  selectUserStakingOpportunitiesFromStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from './selectors'
import { serializeUserStakingId } from './utils'

describe('opportunitiesSlice selectors', () => {
  const walletId = 'walletId'
  const wallet = {
    byId: {
      [walletId]: [gomesAccountId, fauxmesAccountId, catpuccinoAccountId],
    },
    ids: [walletId],
  }
  const mockBaseState = {
    ...mockStore,
    opportunities: initialState,
    portfolio: {
      ...mockStore.portfolio,
      walletId,
      wallet,
    },
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
          stakedAmountCryptoBaseUnit: '1337',
          stakedAmountCryptoPrecision: '0.000000000000001337',
          rewardsAmountsCryptoPrecision: ['420'] as [string],
          rewardsAmountsCryptoBaseUnit: ['420000000000000000000'] as [string],
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoBaseUnit: '4',
          stakedAmountCryptoPrecision: '0.000000000000000004',
          rewardsAmountsCryptoPrecision: ['3'] as [string],
          rewardsAmountsCryptoBaseUnit: ['3000000000000000000'] as [string],
        },
        [serializeUserStakingId(fauxmesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoBaseUnit: '9000',
          stakedAmountCryptoPrecision: '0.000000000000009',
          rewardsAmountsCryptoPrecision: ['1'] as [string],
          rewardsAmountsCryptoBaseUnit: ['1000000000000000000'] as [string],
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
    const mockOpportunityMetadata: OpportunityMetadata = {
      // The LP token AssetId
      assetId: foxEthLpAssetId,
      provider: DefiProvider.FoxEthLP,
      tvl: '424242',
      apy: '0.42',
      type: DefiType.LiquidityPool,
      underlyingAssetId: foxEthLpAssetId,
      underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
      underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [string, string],
    }
    const staking = {
      ...initialState.staking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [mockStakingContractOne]: mockOpportunityMetadata,
        [mockStakingContractTwo]: mockOpportunityMetadata,
      },
    }
    const userStaking = {
      ...initialState.userStaking,
      ids: [
        serializeUserStakingId(gomesAccountId, mockStakingContractTwo),
        serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        serializeUserStakingId(fauxmesAccountId, mockStakingContractOne),
      ],
      byId: {
        [serializeUserStakingId(gomesAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoBaseUnit: '1337',
          stakedAmountCryptoPrecision: '0.000000000000001337',
          rewardsAmountsCryptoPrecision: ['420'] as [string],
          rewardsAmountsCryptoBaseUnit: ['420000000000000000000'] as [string],
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoBaseUnit: '4',
          stakedAmountCryptoPrecision: '0.000000000000000004',
          rewardsAmountsCryptoPrecision: ['3'] as [string],
          rewardsAmountsCryptoBaseUnit: ['3000000000000000000'] as [string],
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
        apy: '0.42',
        assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        provider: 'UNI V2',
        rewardsAmountsCryptoBaseUnit: ['420000000000000000000'],
        rewardsAmountsCryptoPrecision: ['420'],
        stakedAmountCryptoBaseUnit: '1337',
        stakedAmountCryptoPrecision: '0.000000000000001337',
        tvl: '424242',
        type: 'lp',
        underlyingAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        underlyingAssetIds: [
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          'eip155:1/slip44:60',
        ],
        underlyingAssetRatios: ['5000000000000000', '202200000000000000000'],
      })
      expect(
        selectUserStakingOpportunityByUserStakingId(mockState, {
          userStakingId: serializeUserStakingId(gomesAccountId, mockStakingContractOne),
        }),
      ).toEqual({
        apy: '0.42',
        assetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        provider: 'UNI V2',
        stakedAmountCryptoBaseUnit: '4',
        stakedAmountCryptoPrecision: '0.000000000000000004',
        rewardsAmountsCryptoBaseUnit: ['3000000000000000000'] as [string],
        rewardsAmountsCryptoPrecision: ['3'] as [string],
        tvl: '424242',
        type: 'lp',
        underlyingAssetId: 'eip155:1/erc20:0x470e8de2ebaef52014a47cb5e6af86884947f08c',
        underlyingAssetIds: [
          'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
          'eip155:1/slip44:60',
        ],
        underlyingAssetRatios: ['5000000000000000', '202200000000000000000'],
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
          underlyingAssetId: foxEthLpAssetId,
          underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [string, string],
        },
      },
      ids: [mockStakingContractTwo],
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
          stakedAmountCryptoBaseUnit: '1337',
          stakedAmountCryptoPrecision: '0.000000000000001337',
          rewardsAmountsCryptoPrecision: ['420'] as [string],
          rewardsAmountsCryptoBaseUnit: ['420000000000000000000'] as [string],
        },
        [serializeUserStakingId(catpuccinoAccountId, mockStakingContractTwo)]: {
          stakedAmountCryptoBaseUnit: '100',
          stakedAmountCryptoPrecision: '0.0000000000000001',
          rewardsAmountsCryptoPrecision: ['10'] as [string],
          rewardsAmountsCryptoBaseUnit: ['1000000000000000000'] as [string],
        },
        [serializeUserStakingId(gomesAccountId, mockStakingContractOne)]: {
          stakedAmountCryptoBaseUnit: '4',
          stakedAmountCryptoPrecision: '0.000000000000000004',
          rewardsAmountsCryptoPrecision: ['3'] as [string],
          rewardsAmountsCryptoBaseUnit: ['3000000000000000000'] as [string],
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
        const result = selectUserStakingOpportunitiesFromStakingId(mockState, {
          stakingId: mockStakingContractTwo,
        })
        expect(result).toEqual([
          {
            apy: '1000',
            assetId: mockStakingContractTwo,
            provider: DefiProvider.FoxEthLP,
            rewardsAmountsCryptoBaseUnit: ['420000000000000000000'] as [string],
            rewardsAmountsCryptoPrecision: ['420'] as [string],
            stakedAmountCryptoBaseUnit: '1337',
            stakedAmountCryptoPrecision: '0.000000000000001337',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetId: foxEthLpAssetId,
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
            rewardsAmountsCryptoBaseUnit: ['1000000000000000000'] as [string],
            rewardsAmountsCryptoPrecision: ['10'] as [string],
            stakedAmountCryptoBaseUnit: '100',
            stakedAmountCryptoPrecision: '0.0000000000000001',
            tvl: '91283233211',
            type: DefiType.LiquidityPool,
            underlyingAssetId: foxEthLpAssetId,
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
          underlyingAssetId: foxEthLpAssetId,
          underlyingAssetIds: foxEthPair,
          underlyingAssetRatios: ['5000000000000000', '202200000000000000000'] as [string, string],
          rewardsAmountsCryptoBaseUnit: ['421000000000000000000'] as [string],
          rewardsAmountsCryptoPrecision: ['430'] as [string],
          stakedAmountCryptoBaseUnit: '1437',
          stakedAmountCryptoPrecision: '0.000000000000001437',
        })
      })
    })
  })
})
