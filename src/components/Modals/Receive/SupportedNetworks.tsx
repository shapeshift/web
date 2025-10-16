import { Flex, Text } from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { getUniqueChainIdsFromAssetIds } from './utils'

import { ChainIcons } from '@/components/ChainIcons'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectRelatedAssetIdsInclusive } from '@/state/slices/related-assets-selectors'
import { useAppSelector } from '@/state/store'

type SupportedNetworksProps = {
  asset: Asset
  maxIcons?: number
}

const MAX_VISIBLE_ICONS = 6

export const SupportedNetworks = ({
  asset,
  maxIcons = MAX_VISIBLE_ICONS,
}: SupportedNetworksProps) => {
  const { assetId, chainId } = asset
  const translate = useTranslate()

  const relatedAssetIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusive(state, relatedAssetIdsFilter),
  )

  const currentChainNamespace = useMemo(() => fromChainId(chainId).chainNamespace, [chainId])

  // Filter related assets to only include those with matching receive addresses
  const filteredRelatedAssetIds = useMemo(() => {
    return relatedAssetIds.filter(relatedAssetId => {
      const { chainId: relatedChainId } = fromAssetId(relatedAssetId)
      const { chainNamespace } = fromChainId(relatedChainId)

      // EVM chains share addresses
      if (currentChainNamespace === CHAIN_NAMESPACE.Evm && chainNamespace === CHAIN_NAMESPACE.Evm) {
        return true
      }

      // For non-EVM chains, only show the current chain
      return chainId === relatedChainId
    })
  }, [relatedAssetIds, chainId, currentChainNamespace])

  const supportedChainIds = useMemo(
    () => getUniqueChainIdsFromAssetIds(filteredRelatedAssetIds),
    [filteredRelatedAssetIds],
  )

  const chainAdapterManager = getChainAdapterManager()
  const tooltipLabel = useMemo(() => {
    return supportedChainIds
      .map(chainId => chainAdapterManager.get(chainId)?.getDisplayName())
      .filter((name): name is string => Boolean(name))
      .join(', ')
  }, [supportedChainIds, chainAdapterManager])

  if (!supportedChainIds.length) return null

  return (
    <Flex direction='column' align='center' gap={2}>
      <TooltipWithTouch label={tooltipLabel}>
        <ChainIcons chainIds={supportedChainIds} maxVisible={maxIcons} size={5} />
      </TooltipWithTouch>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
        {translate('modals.receive.supportedNetworks')}
      </Text>
    </Flex>
  )
}
