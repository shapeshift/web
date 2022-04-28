import { createSelector } from '@reduxjs/toolkit'
import { ReduxState } from 'state/reducer'

import { PubKey } from './validatorDataSlice'

export const selectValidatorAddress = (_state: ReduxState, validatorAddress: PubKey) =>
  validatorAddress

export const selectValidatorData = (state: ReduxState) => state.validatorData
export const selectAllValidatorsData = createSelector(
  selectValidatorData,
  validatorData => validatorData.byValidator,
)

export const selectSingleValidator = createSelector(
  selectValidatorData,
  selectValidatorAddress,
  (stakingData, validatorAddress) => {
    return stakingData.byValidator[validatorAddress] || null
  },
)
