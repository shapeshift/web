import { getStarknetInjectedProvider } from '@shapeshiftoss/hdwallet-starknet-injected'
import { useMemo } from 'react'

import type { StarknetInjectedKeyManager } from '../config'
import {
  STARKNET_INJECTED_KEYMANAGERS,
  STARKNET_INJECTED_PROVIDER_ID_BY_KEYMANAGER,
} from '../config'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

export const useInstalledStarknetWallets = (): StarknetInjectedKeyManager[] => {
  const isStarknetEnabled = useFeatureFlag('Starknet')
  const isStarknetWalletsEnabled = useFeatureFlag('StarknetWallets')

  return useMemo(() => {
    if (!isStarknetEnabled || !isStarknetWalletsEnabled) return []

    return STARKNET_INJECTED_KEYMANAGERS.filter(keyManager =>
      Boolean(getStarknetInjectedProvider(STARKNET_INJECTED_PROVIDER_ID_BY_KEYMANAGER[keyManager])),
    )
  }, [isStarknetEnabled, isStarknetWalletsEnabled])
}
