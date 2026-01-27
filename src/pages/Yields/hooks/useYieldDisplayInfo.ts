import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  FIGMENT_VALIDATOR_LOGO,
  FIGMENT_VALIDATOR_NAME,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, ProviderDto } from '@/lib/yieldxyz/types'
import { isStakingYieldType } from '@/lib/yieldxyz/utils'

export type YieldDisplayInfo = {
  name?: string
  logoURI?: string
  title?: string
}

export const useYieldDisplayInfo = (providers: Record<string, ProviderDto> | undefined) => {
  const translate = useTranslate()

  return useCallback(
    (yieldItem: AugmentedYieldDto): YieldDisplayInfo => {
      const isNativeStaking =
        isStakingYieldType(yieldItem.mechanics.type) &&
        yieldItem.mechanics.requiresValidatorSelection

      if (yieldItem.id === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID) {
        return {
          name: SHAPESHIFT_VALIDATOR_NAME,
          logoURI: SHAPESHIFT_VALIDATOR_LOGO,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }

      if (
        yieldItem.id === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID ||
        (yieldItem.id.includes('solana') && yieldItem.id.includes('native'))
      ) {
        return {
          name: FIGMENT_VALIDATOR_NAME,
          logoURI: FIGMENT_VALIDATOR_LOGO,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }

      if (isNativeStaking) {
        return {
          name: yieldItem.metadata.name,
          logoURI: yieldItem.metadata.logoURI,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }

      const provider = providers?.[yieldItem.providerId]
      return { name: provider?.name, logoURI: provider?.logoURI }
    },
    [translate, providers],
  )
}
