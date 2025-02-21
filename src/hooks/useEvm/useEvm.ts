import type { ChainId } from '@shapeshiftmonorepo/caip'
import { CHAIN_NAMESPACE, isChainReference, toChainId } from '@shapeshiftmonorepo/caip'
import { isEvmChainId } from '@shapeshiftmonorepo/chain-adapters'
import type { KnownChainIds } from '@shapeshiftmonorepo/types'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupportedEvmChainIds } from 'lib/utils/evm'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectFeatureFlags } from '@/state/slices/preferencesSlice/selectors'
import { useAppSelector } from '@/state/store'

export const useEvm = () => {
  const {
    state: { wallet },
  } = useWallet()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [chainId, setChainId] = useState<ChainId>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const supportedEvmChainIds = useMemo(
    () => getSupportedEvmChainIds(),
    // We want to explicitly react on featureFlags to get a new reference here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureFlags],
  )
  const isSupportedEvmChainId = useCallback(
    (chainId?: ChainId) => {
      return (
        chainId !== undefined &&
        supportedEvmChainIds.includes(chainId as KnownChainIds) &&
        isEvmChainId(chainId)
      )
    },
    [supportedEvmChainIds],
  )

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      const maybeChainReference = (await (wallet as ETHWallet)?.ethGetChainId?.())?.toString() ?? ''
      const chainNamespace = CHAIN_NAMESPACE.Evm

      if (isChainReference(maybeChainReference)) {
        setChainId(
          toChainId({
            chainNamespace,
            chainReference: maybeChainReference,
          }),
        )
      }
    })()
  }, [wallet])

  const connectedEvmChainId = useMemo(() => {
    if (chainId && isLoading) {
      setIsLoading(false)
    }

    if (!isSupportedEvmChainId(chainId)) return

    return chainId
  }, [chainId, isLoading, isSupportedEvmChainId])

  const result = useMemo(
    () => ({
      connectedEvmChainId,
      isSupportedEvmChainId,
      isLoading,
      setChainId,
      supportedEvmChainIds,
    }),
    [connectedEvmChainId, isLoading, isSupportedEvmChainId, supportedEvmChainIds],
  )

  return result
}
