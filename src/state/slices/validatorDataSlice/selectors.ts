import type { cosmossdk } from '@keepkey/chain-adapters'
import { createSelector } from '@reduxjs/toolkit'
import type { ReduxState } from 'state/reducer'

import type { PubKey, ValidatorData, ValidatorDataByPubKey } from './validatorDataSlice'

export const selectValidatorAddress = (_state: ReduxState, validatorAddress: PubKey) =>
  validatorAddress

export const selectValidatorData = (state: ReduxState): ValidatorData => state.validatorData
export const selectValidators = createSelector(
  selectValidatorData,
  (validatorData): ValidatorDataByPubKey => validatorData.byValidator,
)

export const selectValidatorByAddress = createSelector(
  selectValidatorData,
  selectValidatorAddress,
  (stakingData, validatorAddress): cosmossdk.Validator | null => {
    return stakingData.byValidator[validatorAddress] || null
  },
)
