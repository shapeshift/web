import { useQuery } from '@tanstack/react-query'

import { getYieldValidators } from '@/lib/yieldxyz/api'
import type { ValidatorDto } from '@/lib/yieldxyz/types'

export const useYieldValidators = (yieldId: string, enabled: boolean = true) => {
  return useQuery<ValidatorDto[], Error, ValidatorDto[]>({
    queryKey: ['yieldxyz', 'validators', yieldId],
    queryFn: async () => {
      const data = await getYieldValidators(yieldId)

      // Monkey patch correct ShapeShift DAO Validator for Cosmos (missing from API)
      if (yieldId === 'cosmos-atom-native-staking') {
        const { assertGetCosmosSdkChainAdapter } = await import('@/lib/utils/cosmosSdk')
        const { cosmosChainId } = await import('@shapeshiftoss/caip')
        const { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } = await import('@/lib/yieldxyz/constants')

        const found = data.items.find(v => v.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS)
        if (!found) {
          let apr = '0.1425' // Default fallback
          try {
            const adapter = assertGetCosmosSdkChainAdapter(cosmosChainId)
            const validatorData = await adapter.getValidator(SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS)
            if (validatorData?.apr) apr = validatorData.apr
          } catch (e) {
            console.error('Failed to fetch ShapeShift Validator APY', e)
          }

          data.items.unshift({
            address: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
            preferred: true,
            name: 'ShapeShift DAO',
            logoURI:
              'https://raw.githubusercontent.com/cosmostation/chainlist/main/chain/cosmos/moniker/cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf.png',
            website: 'https://www.shapeshift.com',
            commission: 0.1,
            votingPower: 0.002702313425423967,
            status: 'active',
            tvl: '778899.302147',
            tvlRaw: '778899302147',
            rewardRate: {
              total: parseFloat(apr),
              rateType: 'APR' as const,
              components: [],
            },
          })
        }
      }

      return data.items
    },
    enabled: enabled && !!yieldId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
