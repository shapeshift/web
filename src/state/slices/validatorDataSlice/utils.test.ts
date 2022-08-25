import {
  cosmosAssetId,
  cosmosChainId,
  ethAssetId,
  ethChainId,
  osmosisAssetId,
  osmosisChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import { cosmosPubKeys, osmoPubKeys } from 'test/mocks/accounts'

import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from './constants'
import {
  getDefaultValidatorAddressFromAccountId,
  getDefaultValidatorAddressFromAssetId,
  getDefaultValidatorAddressFromChainId,
} from './utils'

describe('validatorDataSlice/utils', () => {
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
    it('returns empty string from non Cosmos SDK chainId', () => {
      const actual = getDefaultValidatorAddressFromChainId(ethChainId)
      const expected = ''

      expect(actual).toEqual(expected)
    })
  })
  describe('getDefaultValidatorAddressFromAssetId', () => {
    it('gets default Cosmos ShapeShift Validator address from cosmosAssetId', () => {
      const actual = getDefaultValidatorAddressFromAssetId(cosmosAssetId)
      const expected = SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('gets default Osmosis ShapeShift Validator address from osmosisChainId', () => {
      const actual = getDefaultValidatorAddressFromAssetId(osmosisAssetId)
      const expected = SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('returns empty string from non Cosmos SDK assetId', () => {
      const actual = getDefaultValidatorAddressFromAssetId(ethAssetId)
      const expected = ''

      expect(actual).toEqual(expected)
    })
  })
  describe('getDefaultValidatorAddressFromAccountId', () => {
    it('gets default Cosmos ShapeShift Validator address from a cosmos AccountId', () => {
      const mockAccountId = toAccountId({ chainId: cosmosChainId, account: cosmosPubKeys[0] })
      const actual = getDefaultValidatorAddressFromAccountId(mockAccountId)
      const expected = SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('gets default Osmosis ShapeShift Validator address from a osmo AccountId', () => {
      const mockAccountId = toAccountId({ chainId: osmosisChainId, account: osmoPubKeys[0] })
      const actual = getDefaultValidatorAddressFromAccountId(mockAccountId)
      const expected = SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS

      expect(actual).toEqual(expected)
    })
    it('returns empty string from non Cosmos SDK AccountId', () => {
      const mockAccountId = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
      const actual = getDefaultValidatorAddressFromAccountId(mockAccountId)
      const expected = ''

      expect(actual).toEqual(expected)
    })
  })
})
