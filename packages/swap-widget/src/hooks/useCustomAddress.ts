import { fromChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'

import type { ChainId } from '../types'
import { validateAddress } from '../utils/addressValidation'

type ChainNamespace = ReturnType<typeof fromChainId>['chainNamespace']

type ScopedAddress = { address: string; chainNamespace: ChainNamespace }

// A custom address belongs to the chain family it was entered for. It is hidden on any other family,
// even where a permissive validator (NEAR, Starknet) would accept it, and wherever it stops validating.
export const useCustomAddress = (
  chainId: ChainId,
  initialAddress = '',
): [string, (address: string, forChainId?: ChainId) => void] => {
  const [scoped, setScoped] = useState<ScopedAddress>(() => ({
    address: initialAddress,
    chainNamespace: fromChainId(chainId).chainNamespace,
  }))

  const setAddress = useCallback(
    (address: string, forChainId: ChainId = chainId) =>
      setScoped({ address, chainNamespace: fromChainId(forChainId).chainNamespace }),
    [chainId],
  )

  const address = useMemo(() => {
    if (!scoped.address) return ''
    if (scoped.chainNamespace !== fromChainId(chainId).chainNamespace) return ''
    return validateAddress(scoped.address, chainId).valid ? scoped.address : ''
  }, [scoped, chainId])

  return [address, setAddress]
}
