import { createSelector } from '@reduxjs/toolkit'
import { chainAdapters } from '@shapeshiftoss/types'
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
  (stakingData, validatorAddress): chainAdapters.cosmos.Validator | null => {
    return stakingData.byValidator[validatorAddress] || null
  },
)
