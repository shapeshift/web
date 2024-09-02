import { CHAIN_NAMESPACE, type ChainId, isChainReference, toChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

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
        evm.isEvmChainId(chainId)
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
