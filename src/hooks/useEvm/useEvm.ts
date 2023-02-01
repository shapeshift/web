import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

const chainIdFromEthNetwork = (
  ethNetwork: string | undefined,
  supportedEvmChainIds: ChainId[],
): ChainId | undefined => {
  if (!ethNetwork) return

  return supportedEvmChainIds.find(chainId => fromChainId(chainId).chainReference === ethNetwork)
}

export const getSupportedEvmChainIds = () =>
  Array.from(getChainAdapterManager().keys()).filter(
    chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm,
  )

export const useEvm = () => {
  const {
    state: { wallet },
  } = useWallet()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [ethNetwork, setEthNetwork] = useState<string>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const supportedEvmChainIds = useMemo(
    () => getSupportedEvmChainIds(),
    // We want to explicitly react on featureFlags to get a new reference here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureFlags],
  )
  const getChainIdFromEthNetwork = useCallback(
    (ethNetwork: string) => chainIdFromEthNetwork(ethNetwork, supportedEvmChainIds),
    [supportedEvmChainIds],
  )

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      const ethNetwork = await (wallet as ETHWallet)?.ethGetChainId?.()
      ethNetwork && setEthNetwork(bn(ethNetwork).toString())
    })()
  }, [wallet])

  const connectedEvmChainId = useMemo(() => {
    if (ethNetwork && isLoading) {
      setIsLoading(false)
    }

    return chainIdFromEthNetwork(ethNetwork, supportedEvmChainIds)
  }, [isLoading, ethNetwork, supportedEvmChainIds])

  return {
    connectedEvmChainId,
    getChainIdFromEthNetwork,
    isLoading,
    setEthNetwork,
    supportedEvmChainIds,
  }
}
