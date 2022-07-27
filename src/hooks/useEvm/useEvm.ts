import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useEvm = () => {
  const featureFlags = useAppSelector(selectFeatureFlags)
  const supportedEvmChainIds = useMemo(
    () =>
      Array.from(getChainAdapterManager().keys()).filter(
        chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Ethereum,
      ),
    // We want to explicitly react on featureFlags to get a new reference here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureFlags],
  )

  return { supportedEvmChainIds }
}
