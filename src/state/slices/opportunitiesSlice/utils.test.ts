import { describe, expect, it } from 'vitest'

import { gomesAccountId, mockStakingContractOne } from './mocks'
import type { UserStakingId } from './types'
import type { UserStakingIdParts } from './utils'
import { deserializeUserStakingId, serializeUserStakingId } from './utils'

describe('opportunitiesSlice utils', () => {
  const mockParts: UserStakingIdParts = [gomesAccountId, mockStakingContractOne]
  const mockStakingIdOne: UserStakingId = `${gomesAccountId}*${mockStakingContractOne}`
  describe('serializeUserStakingId', () => {
    it('serializes a UserStakingId from AccountId and StakingId parts', () => {
      const result = serializeUserStakingId(...mockParts)
      expect(result).toEqual(mockStakingIdOne)
    })
  })
  describe('deserializeUserStakingId', () => {
    it('deserializes a UserStakingId into parts', () => {
      const result = deserializeUserStakingId(mockStakingIdOne)
      expect(result).toEqual(mockParts)
    })
  })
})
