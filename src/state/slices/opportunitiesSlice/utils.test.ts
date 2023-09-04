import { gomesAccountId, mockStakingContractOne, mockStakingContractTwo } from './mocks'
import type { UserStakingId } from './types'
import type { UserStakingIdParts } from './utils'
import { deserializeUserStakingId, serializeUserStakingId } from './utils'

describe('opportunitiesSlice utils', () => {
  const mockParts: UserStakingIdParts = [gomesAccountId, mockStakingContractOne]
  const mockStakingIdOne: UserStakingId = `${gomesAccountId}*${mockStakingContractOne}`
  const mockStakingIdTwo: UserStakingId = `${gomesAccountId}*${mockStakingContractTwo}`
  describe('serializeUserStakingId', () => {
    it('serializes a UserStakingId from AccountId and StakingId parts', () => {
      const result = serializeUserStakingId(...mockParts)
      expect(result).toEqual(mockStakingIdOne)
    })
  })
  describe('deserializeUserStakingId', () => {
    const result = deserializeUserStakingId(mockStakingIdTwo)
    expect(result).toEqual(mockParts)
  })
})
