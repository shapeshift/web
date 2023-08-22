import { cosmosChainId, ethChainId, osmosisChainId } from '@shapeshiftoss/caip'

import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from './constants'
import { getDefaultValidatorAddressFromChainId } from './utils'

describe('resolvers/cosmosSdk/utils', () => {
  describe('getDefaultValidatorAddressFromChainId', () => {
    it('gets default Cosmos ShapeShift Validator address from cosmosChainId', () => {
      const actual = getDefaultValidatorAddressFromChainId(cosmosChainId)
      const expected = SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('gets default Osmosis ShapeShift Validator address from osmosisChainId', () => {
      const actual = getDefaultValidatorAddressFromChainId(osmosisChainId)
      const expected = SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('throws from non Cosmos SDK chainId', () => {
      expect(() => getDefaultValidatorAddressFromChainId(ethChainId)).toThrow()
    })
  })
})
