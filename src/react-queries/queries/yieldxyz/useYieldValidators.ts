import { skipToken, useQuery } from '@tanstack/react-query'

import { fetchYieldValidators } from '@/lib/yieldxyz/api'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR,
} from '@/lib/yieldxyz/constants'
import type { ValidatorDto } from '@/lib/yieldxyz/types'
import { ensureValidatorApr } from '@/lib/yieldxyz/utils'

const normalizeCosmosValidators = (validators: ValidatorDto[]): ValidatorDto[] => {
  const existingShapeshift = validators.find(v => v.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS)

  const shapeshiftValidator: ValidatorDto = existingShapeshift?.rewardRate?.total
    ? { ...existingShapeshift, preferred: true }
    : { ...SHAPESHIFT_VALIDATOR, ...existingShapeshift, preferred: true }

  const otherValidators = validators
    .filter(v => v.address !== SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS)
    .map(v => ensureValidatorApr({ ...v, preferred: false }))

  return [shapeshiftValidator, ...otherValidators]
}

export const useYieldValidators = (yieldId: string, enabled: boolean = true) => {
  return useQuery<ValidatorDto[], Error, ValidatorDto[]>({
    queryKey: ['yieldxyz', 'validators', yieldId],
    queryFn:
      yieldId && enabled
        ? async () => {
            const data = await fetchYieldValidators(yieldId)
            const validators = data.items
            if (yieldId === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID)
              return normalizeCosmosValidators(validators)
            return validators
          }
        : skipToken,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  })
}
