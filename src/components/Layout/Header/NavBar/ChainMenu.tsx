import type { BoxProps, ButtonProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsEthSwitchChain } from '@shapeshiftoss/hdwallet-core'
import { memo, useCallback, useMemo } from 'react'
import { toHex } from 'viem'

import { ChainMenu as BasicChainMenu } from '@/components/ChainMenu'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useEvm } from '@/hooks/useEvm/useEvm'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { selectAssetById, selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const buttonProps: ButtonProps = {
  iconSpacing: 2,
  px: 2,
  width: { base: 'full', md: 'auto' },
}

type ChainMenuProps = BoxProps

export const ChainMenu = memo((props: ChainMenuProps) => {
  const { state, load } = useWallet()
  const {
    connectedEvmChainId,
    isSupportedEvmChainId,
    isLoading,
    setChainId,
    supportedEvmChainIds,
  } = useEvm()
  const chainAdapterManager = getChainAdapterManager()

  const assets = useAppSelector(selectAssets)

  const handleChainClick = useCallback(
    async (requestedChainId: ChainId) => {
      try {
        if (!isSupportedEvmChainId(requestedChainId)) {
          throw new Error(`Unsupported EVM network: ${requestedChainId}`)
        }

        const requestedChainChainAdapter = assertGetEvmChainAdapter(requestedChainId)

        const requestedChainFeeAssetId = requestedChainChainAdapter.getFeeAssetId()
        const requestedChainFeeAsset = assets[requestedChainFeeAssetId]
        if (!requestedChainFeeAsset)
          throw new Error(`Asset not found for AssetId ${requestedChainFeeAssetId}`)

        const requestedChainRpcUrl = requestedChainChainAdapter.getRpcUrl()
        await (state.wallet as ETHWallet).ethSwitchChain?.({
          chainId: toHex(Number(fromChainId(requestedChainId).chainReference)),
          chainName: requestedChainChainAdapter.getDisplayName(),
          nativeCurrency: {
            name: requestedChainFeeAsset.name,
            symbol: requestedChainFeeAsset.symbol,
            decimals: 18,
          },
          rpcUrls: [requestedChainRpcUrl],
          blockExplorerUrls: [requestedChainFeeAsset.explorer],
        })
        setChainId(requestedChainId)
        load()
      } catch (e) {
        console.error(e)
      }
    },
    [assets, isSupportedEvmChainId, load, setChainId, state.wallet],
  )

  const currentChainNativeAssetId = useMemo(
    () => chainAdapterManager.get(connectedEvmChainId ?? '')?.getFeeAssetId(),
    [chainAdapterManager, connectedEvmChainId],
  )
  const currentChainNativeAsset = useAppSelector(state =>
    selectAssetById(state, currentChainNativeAssetId ?? ''),
  )

  const canSwitchChains = useMemo(
    () => !isLoading && (supportedEvmChainIds.length > 1 || !connectedEvmChainId),
    [isLoading, connectedEvmChainId, supportedEvmChainIds.length],
  )

  if (!state.wallet) return null
  if (!supportsEthSwitchChain(state.wallet)) return null

  // don't show the menu if there is only one chain
  if (!canSwitchChains) return null

  return (
    <Box {...props}>
      <BasicChainMenu
        activeChainId={connectedEvmChainId}
        chainIds={supportedEvmChainIds}
        isActiveChainIdSupported={currentChainNativeAsset !== undefined}
        isDisabled={!canSwitchChains}
        buttonProps={buttonProps}
        onMenuOptionClick={handleChainClick}
      />
    </Box>
  )
})
