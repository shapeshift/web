import { Box, Circle, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types/dist/cjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { getUniqueChainDataFromAssetIds } from './utils'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { selectRelatedAssetIdsInclusive } from '@/state/slices/related-assets-selectors'
import { selectAssets } from '@/state/slices/selectors'
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
  const assetsById = useAppSelector(selectAssets)

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

  const chainDataForRelatedAssets = useMemo(
    () => getUniqueChainDataFromAssetIds(filteredRelatedAssetIds, assetsById),
    [filteredRelatedAssetIds, assetsById],
  )

  const visibleChains = chainDataForRelatedAssets.slice(0, maxIcons)
  const remainingCount = chainDataForRelatedAssets.length - maxIcons

  const remainingBg = useColorModeValue('gray.100', 'gray.700')

  const tooltipLabel = useMemo(() => {
    return chainDataForRelatedAssets.map(chain => chain.name).join(', ')
  }, [chainDataForRelatedAssets])

  if (!chainDataForRelatedAssets.length) return null

  return (
    <Flex direction='column' align='center' gap={2}>
      <TooltipWithTouch label={tooltipLabel}>
        <Flex align='center'>
          {visibleChains.map((chain, index) => {
            return (
              <Box key={chain.chainId} ml={index === 0 ? 0 : -1.5} zIndex={index}>
                <LazyLoadAvatar boxSize={5} src={chain.icon} title={chain.name} />
              </Box>
            )
          })}
          {remainingCount > 0 && (
            <Circle
              size={5}
              bg='background.button.secondary.base'
              color='text.base'
              fontSize='2xs'
              fontWeight='medium'
              ml={-1.5}
              backgroundColor={remainingBg}
              zIndex={visibleChains.length}
            >
              +{remainingCount}
            </Circle>
          )}
        </Flex>
      </TooltipWithTouch>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
        {translate('modals.receive.supportedNetworks')}
      </Text>
    </Flex>
  )
}
