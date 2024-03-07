import { CHAIN_NAMESPACE, type ChainId, isChainReference, toChainId } from '@shapeshiftoss/caip'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getSupportedEvmChainIds } from 'lib/utils/evm'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

const evmChainIdFromChainId = (
  maybeEvmChainId: ChainId | undefined,
  supportedEvmChainIds: ChainId[],
): ChainId | undefined => {
  if (!maybeEvmChainId) return
  return supportedEvmChainIds.find(chainId => chainId === maybeEvmChainId)
}

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
  const isEvmChainId = useCallback(
    (chainId: ChainId) => evmChainIdFromChainId(chainId, supportedEvmChainIds) !== undefined,
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

    return evmChainIdFromChainId(chainId, supportedEvmChainIds)
  }, [isLoading, chainId, supportedEvmChainIds])

  return useMemo(
    () => ({
      connectedEvmChainId,
      isEvmChainId,
      isLoading,
      setEthNetwork: setChainId,
      supportedEvmChainIds,
    }),
    [connectedEvmChainId, isEvmChainId, isLoading, supportedEvmChainIds],
  )
}
