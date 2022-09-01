import { CHAIN_NAMESPACE, ChainId, fromChainId } from '@shapeshiftoss/caip'
import { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useMemo, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useEvm = () => {
  const {
    state: { wallet },
  } = useWallet()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [ethNetwork, setEthNetwork] = useState<string | null>()
  const [connectedEvmChainId, setConnectedEvmChainId] = useState<ChainId>()
  const featureFlags = useAppSelector(selectFeatureFlags)
  const supportedEvmChainIds = useMemo(
    () =>
      Array.from(getChainAdapterManager().keys()).filter(
        chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm,
      ),
    // We want to explicitly react on featureFlags to get a new reference here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureFlags],
  )

  useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      setEthNetwork(null)
      const ethNetwork = await (wallet as ETHWallet)?.ethGetChainId?.()
      if (ethNetwork) setEthNetwork(bnOrZero(ethNetwork).toString())
    })()
  }, [wallet])

  useEffect(() => {
    ethNetwork && isLoading && setIsLoading(false)
    const connectedEvmChainId = supportedEvmChainIds.find(
      chainId => fromChainId(chainId).chainReference === ethNetwork,
    )
    setConnectedEvmChainId(connectedEvmChainId)
  }, [ethNetwork, isLoading, supportedEvmChainIds])

  return { supportedEvmChainIds, connectedEvmChainId, setEthNetwork, isLoading }
}
