import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChainId } from '../types'
import { sharesAddressSpace } from '../utils/addressSpace'

type ScopedAddress = { address: string; chainId: ChainId }

// A custom address is kept with the chain it was entered for and retired once the chain moves away from it
export const useCustomAddress = (
  chainId: ChainId,
): [string, (address: string, forChainId?: ChainId) => void] => {
  const [scoped, setScoped] = useState<ScopedAddress>({ address: '', chainId })

  const chainIdRef = useRef(chainId)
  chainIdRef.current = chainId

  const setAddress = useCallback(
    (address: string, forChainId: ChainId = chainIdRef.current) =>
      setScoped({ address, chainId: forChainId }),
    [],
  )

  const previousChainIdRef = useRef(chainId)
  useEffect(() => {
    if (previousChainIdRef.current === chainId) return
    previousChainIdRef.current = chainId
    setScoped(current =>
      current.address && !sharesAddressSpace(current.chainId, chainId)
        ? { address: '', chainId }
        : current,
    )
  }, [chainId])

  return [sharesAddressSpace(scoped.chainId, chainId) ? scoped.address : '', setAddress]
}
