import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useState } from 'react'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

export const useEvm = () => {
  const { state } = useWallet()
  const [evmChainId, setEvmChainId] = useState<string | null>(null)
  const featureFlags = useAppSelector(selectFeatureFlags)
  const supportedEvmChainIds = useMemo(
    () =>
      Array.from(getChainAdapters().keys()).filter(
        chainId => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Ethereum,
      ),
    // We want to explicitly react on featureFlags to get a new reference here
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featureFlags],
  )

  useEffect(() => {
    ;(async () => {
      const chainId = await (state.wallet as ETHWallet)?.ethGetChainId?.()
      if (chainId) setEvmChainId(bnOrZero(chainId).toString())
    })()
  }, [state])

  const connectedChainId = useMemo(
    () => supportedEvmChainIds.find(chainId => fromChainId(chainId).chainReference === evmChainId),
    [evmChainId, supportedEvmChainIds],
  )

  return { supportedEvmChainIds, connectedChainId, setEvmChainId }
}
