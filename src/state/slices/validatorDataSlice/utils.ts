import type { AccountId, AssetId, ChainId } from '@keepkey/caip'
import { cosmosChainId, fromAccountId, fromAssetId, osmosisChainId } from '@keepkey/caip'
import flow from 'lodash/flow'

import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from './constants'

export const getDefaultValidatorAddressFromChainId = (chainId: ChainId) => {
  switch (chainId) {
    case cosmosChainId:
      return SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS
    case osmosisChainId:
      return SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS
    default:
      throw new Error(`chainId ${chainId} is not a valid Cosmos SDK chainId`)
  }
}
export const getDefaultValidatorAddressFromAssetId = flow([
  (assetId: AssetId) => fromAssetId(assetId).chainId,
  getDefaultValidatorAddressFromChainId,
])

export const getDefaultValidatorAddressFromAccountId = flow(
  (accountId: AccountId) => fromAccountId(accountId).chainId,
  getDefaultValidatorAddressFromChainId,
)
