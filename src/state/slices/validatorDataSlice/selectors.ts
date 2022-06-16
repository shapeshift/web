import { createSelector } from '@reduxjs/toolkit'
import { cosmos } from '@shapeshiftoss/chain-adapters'
import { ReduxState } from 'state/reducer'

import { PubKey, ValidatorData, ValidatorDataByPubKey } from './validatorDataSlice'

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
  (stakingData, validatorAddress): cosmos.Validator | null => {
    return stakingData.byValidator[validatorAddress] || null
  },
)
