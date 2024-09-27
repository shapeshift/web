import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearState, store } from 'state/store'

import { foxEthLpAssetId } from './constants'
import {
  fauxmesAccountId,
  gomesAccountId,
  mockLpContractOne,
  mockLpContractTwo,
  mockStakingContractOne,
} from './mocks'
import { initialState, opportunities } from './opportunitiesSlice'
import { DefiProvider, DefiType } from './types'
import { serializeUserStakingId } from './utils'

describe('opportunitiesSlice', () => {
  beforeEach(() => {
    clearState()
  })

  it('returns uninitialized properties for initialState', () => {
    expect(store.getState().opportunities).toEqual({
      ...initialState,
      _persist: {
        rehydrated: true,
        version: 0,
      },
    })
  })

  describe('reducers', () => {
    beforeEach(() => {
      store.dispatch(opportunities.actions.clear())
    })
    describe('clear', () => {
      it.todo('clears state back to initial state')
    })
    describe('upsertOpportunityMetadata', () => {
      it('inserts metadata', () => {
        const payload = {
          byId: {
            [mockLpContractOne]: {
              // The LP token AssetId
              assetId: foxEthLpAssetId,
              id: foxEthLpAssetId,
              name: 'ETH/FOX Pool',
              underlyingAssetId: foxEthLpAssetId,
              provider: DefiProvider.UniV2,
              tvl: '424242',
              apy: '0.42',
              type: DefiType.LiquidityPool,
              underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
              underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
                string,
                string,
              ],
              rewardAssetIds: [],
              isClaimableRewards: false,
            },
          },
          type: DefiType.LiquidityPool,
        } as const
        store.dispatch(opportunities.actions.upsertOpportunitiesMetadata(payload))
        expect(store.getState().opportunities.lp.byId).toEqual(payload.byId)
        expect(store.getState().opportunities.lp.ids).toEqual([mockLpContractOne])
      })

      it('merges prevState and payload', () => {
        const insertPayloadOne = {
          byId: {
            [mockLpContractOne]: {
              // The LP token AssetId
              assetId: foxEthLpAssetId,
              id: foxEthLpAssetId,
              name: 'ETH/FOX Pool',
              underlyingAssetId: foxEthLpAssetId,
              provider: DefiProvider.UniV2,
              tvl: '424242',
              apy: '0.42',
              type: DefiType.LiquidityPool,
              underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
              underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
                string,
                string,
              ],
              rewardAssetIds: [],
              isClaimableRewards: false,
            },
          },
          type: DefiType.LiquidityPool,
        } as const

        store.dispatch(opportunities.actions.upsertOpportunitiesMetadata(insertPayloadOne))
        expect(store.getState().opportunities.lp.byId).toEqual(insertPayloadOne.byId)

        const insertPayloadTwo = {
          byId: {
            [mockLpContractTwo]: {
              // The LP token AssetId
              assetId: foxEthLpAssetId,
              id: foxEthLpAssetId,
              name: 'ETH/FOX Pool',
              underlyingAssetId: foxEthLpAssetId,
              provider: DefiProvider.UniV2,
              tvl: '424242',
              apy: '0.42',
              type: DefiType.LiquidityPool,
              underlyingAssetIds: [foxAssetId, ethAssetId] as [AssetId, AssetId],
              underlyingAssetRatiosBaseUnit: ['5000000000000000', '202200000000000000000'] as [
                string,
                string,
              ],
              rewardAssetIds: [],
              isClaimableRewards: false,
            },
          },
          type: DefiType.LiquidityPool,
        } as const

        store.dispatch(opportunities.actions.upsertOpportunitiesMetadata(insertPayloadTwo))
        expect(store.getState().opportunities.lp.byId).toEqual({
          ...insertPayloadOne.byId,
          ...insertPayloadTwo.byId,
        })
        expect(store.getState().opportunities.lp.ids).toEqual([
          mockLpContractOne,
          mockLpContractTwo,
        ])
      })
    })
    describe('upsertOpportunityAccounts', () => {
      it('inserts an LpId for a tuple of a single AccountId - empty byAccountId', () => {
        const payload = {
          byAccountId: {
            [gomesAccountId]: [mockLpContractOne],
          },
          type: DefiType.LiquidityPool as const,
        }

        store.dispatch(opportunities.actions.upsertOpportunityAccounts(payload))
        expect(store.getState().opportunities.lp.byAccountId).toEqual(payload.byAccountId)
      })
      it('inserts a StakingId for a tuple of a single AccountId - empty byAccountId', () => {
        const payload = {
          byAccountId: {
            [gomesAccountId]: [mockStakingContractOne],
          },
          type: DefiType.Staking as const,
        }

        store.dispatch(opportunities.actions.upsertOpportunityAccounts(payload))
        expect(store.getState().opportunities.staking.byAccountId).toEqual(payload.byAccountId)
      })

      it('inserts an LpId for a tuple of a single AccountId - merges prevState and payload byAccountId', () => {
        const insertPayload = {
          byAccountId: {
            [gomesAccountId]: [mockLpContractOne],
          },
          type: DefiType.LiquidityPool as const,
        }

        store.dispatch(opportunities.actions.upsertOpportunityAccounts(insertPayload))
        expect(store.getState().opportunities.lp.byAccountId).toEqual(insertPayload.byAccountId)

        const upsertPayload = {
          byAccountId: {
            [fauxmesAccountId]: [mockLpContractOne],
          },
          type: DefiType.LiquidityPool as const,
        }

        const expected = {
          [gomesAccountId]: [mockLpContractOne],
          [fauxmesAccountId]: [mockLpContractOne],
        }
        store.dispatch(opportunities.actions.upsertOpportunityAccounts(upsertPayload))
        expect(store.getState().opportunities.lp.byAccountId).toEqual(expected)
      })
      it('inserts an StakingId for a tuple of a single AccountId - merges prevState and payload byAccountId', () => {
        const insertPayload = {
          byAccountId: {
            [gomesAccountId]: [mockStakingContractOne],
          },
          type: DefiType.Staking as const,
        }

        store.dispatch(opportunities.actions.upsertOpportunityAccounts(insertPayload))
        expect(store.getState().opportunities.staking.byAccountId).toEqual(
          insertPayload.byAccountId,
        )

        const upsertPayload = {
          byAccountId: {
            [fauxmesAccountId]: [mockStakingContractOne],
          },
          type: DefiType.Staking as const,
        }

        const expected = {
          [gomesAccountId]: [mockStakingContractOne],
          [fauxmesAccountId]: [mockStakingContractOne],
        }
        store.dispatch(opportunities.actions.upsertOpportunityAccounts(upsertPayload))
        expect(store.getState().opportunities.staking.byAccountId).toEqual(expected)
      })
    })

    describe('upsertUserStakingOpportunities', () => {
      it('inserts user data', () => {
        const userStakingId = serializeUserStakingId(gomesAccountId, 'eip155:1:0xMyStakingContract')
        const payload = {
          byId: {
            [userStakingId]: {
              isLoaded: true,
              userStakingId,
              stakedAmountCryptoBaseUnit: '42000',
              rewardsCryptoBaseUnit: {
                amounts: ['42000000000000000000'] as [string],
                claimable: true,
              },
            },
          },
        }
        store.dispatch(opportunities.actions.upsertUserStakingOpportunities(payload))
        expect(store.getState().opportunities.userStaking.byId).toEqual(payload.byId)
        expect(store.getState().opportunities.userStaking.ids).toEqual(Object.keys(payload.byId))
      })
      it('merges prevState and payload', () => {
        const userStakingIdOne = serializeUserStakingId(
          gomesAccountId,
          'eip155:1:0xMyStakingContract',
        )
        const insertPayloadOne = {
          byId: {
            [userStakingIdOne]: {
              isLoaded: true,
              userStakingId: userStakingIdOne,
              stakedAmountCryptoBaseUnit: '42000',
              rewardsCryptoBaseUnit: {
                amounts: ['42000000000000000000'] as [string],
                claimable: true,
              },
            },
          },
        }
        store.dispatch(opportunities.actions.upsertUserStakingOpportunities(insertPayloadOne))
        expect(store.getState().opportunities.userStaking.byId).toEqual(insertPayloadOne.byId)
        expect(store.getState().opportunities.userStaking.ids).toEqual(
          Object.keys(insertPayloadOne.byId),
        )

        const userStakingIdTwo = serializeUserStakingId(
          fauxmesAccountId,
          'eip155:1:0xMyStakingContract',
        )
        const insertPayloadTwo = {
          byId: {
            [userStakingIdTwo]: {
              isLoaded: true,
              userStakingId: userStakingIdTwo,
              stakedAmountCryptoBaseUnit: '42000',
              rewardsCryptoBaseUnit: {
                amounts: ['42000000000000000000'] as [string],
                claimable: true,
              },
            },
          },
        }
        store.dispatch(opportunities.actions.upsertUserStakingOpportunities(insertPayloadTwo))
        expect(store.getState().opportunities.userStaking.byId).toEqual({
          ...insertPayloadOne.byId,
          ...insertPayloadTwo.byId,
        })
        expect(store.getState().opportunities.userStaking.ids).toEqual(
          Object.keys({ ...insertPayloadOne.byId, ...insertPayloadTwo.byId }),
        )
      })
    })
  })
})
