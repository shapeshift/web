import { cosmosChainId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { fetchYieldValidators } from '@/lib/yieldxyz/api'
import {
  COSMOS_DECIMALS,
  COSMOS_SHAPESHIFT_FALLBACK_APR,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
} from '@/lib/yieldxyz/constants'
import type { ValidatorDto } from '@/lib/yieldxyz/types'

const fetchShapeShiftValidatorData = async (): Promise<{
  apr: string
  commission: string
  tokensBaseUnit: string
}> => {
  try {
    const adapter = assertGetCosmosSdkChainAdapter(cosmosChainId)
    const validatorData = await adapter.getValidator(SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS)
    return {
      apr: validatorData?.apr ?? COSMOS_SHAPESHIFT_FALLBACK_APR,
      commission: validatorData?.commission ?? '0.1',
      tokensBaseUnit: validatorData?.tokens ?? '0',
    }
  } catch {
    return { apr: COSMOS_SHAPESHIFT_FALLBACK_APR, commission: '0.1', tokensBaseUnit: '0' }
  }
}

const createShapeShiftValidator = (data: {
  apr: string
  commission: string
  tokensBaseUnit: string
}): ValidatorDto => {
  const tvlPrecision = fromBaseUnit(data.tokensBaseUnit, COSMOS_DECIMALS)

  return {
    address: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
    preferred: true,
    name: 'ShapeShift DAO',
    logoURI: SHAPESHIFT_VALIDATOR_LOGO,
    website: 'https://app.shapeshift.com',
    commission: bnOrZero(data.commission).toNumber(),
    votingPower: 0,
    status: 'active',
    tvl: tvlPrecision,
    tvlRaw: data.tokensBaseUnit,
    rewardRate: {
      total: bnOrZero(data.apr).toNumber(),
      rateType: 'APR' as const,
      components: [],
    },
  }
}

export const useYieldValidators = (yieldId: string, enabled: boolean = true) => {
  return useQuery<ValidatorDto[], Error, ValidatorDto[]>({
    queryKey: ['yieldxyz', 'validators', yieldId],
    queryFn: async () => {
      const data = await fetchYieldValidators(yieldId)

      if (yieldId === 'cosmos-atom-native-staking') {
        const hasShapeShift = data.items.some(
          v => v.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
        )
        if (!hasShapeShift) {
          const validatorData = await fetchShapeShiftValidatorData()
          const shapeShiftValidator = createShapeShiftValidator(validatorData)
          return [shapeShiftValidator, ...data.items]
        }
      }

      return data.items
    },
    enabled: enabled && !!yieldId,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  })
}
