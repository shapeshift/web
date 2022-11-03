import { gomesAccountId, mockStakingContractOne } from './mocks'
import type { UserStakingIdParts } from './utils'
import { deserializeUserStakingId, serializeUserStakingId } from './utils'

describe('opportunitiesSlice utils', () => {
  const mockParts: UserStakingIdParts = [gomesAccountId, mockStakingContractOne]
  describe('serializeUserStakingId', () => {
    it('serializes a UserStakingId from AccountId and StakingId parts', () => {
      const result = serializeUserStakingId(...mockParts)
      expect(result).toEqual('eip155:1:0xgomes*eip155:1:0xStakingContractOne')
    })
  })
  describe('deserializeUserStakingId', () => {
    const result = deserializeUserStakingId('eip155:1:0xgomes*eip155:1:0xStakingContractOne')
    expect(result).toEqual(mockParts)
  })
})
