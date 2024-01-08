import { cosmosChainId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from './constants'
import { getDefaultValidatorAddressFromChainId } from './utils'

describe('resolvers/cosmosSdk/utils', () => {
  describe('getDefaultValidatorAddressFromChainId', () => {
    it('gets default Cosmos ShapeShift Validator address from cosmosChainId', () => {
      const actual = getDefaultValidatorAddressFromChainId(cosmosChainId)
      const expected = SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('throws from non Cosmos SDK chainId', () => {
      expect(() => getDefaultValidatorAddressFromChainId(ethChainId)).toThrow()
    })
  })
})
