import { Box, Circle, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { getUniqueChainDataFromAssetIds } from './utils'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { selectRelatedAssetIdsInclusive } from '@/state/slices/related-assets-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SupportedNetworksProps = {
  assetId: AssetId
  maxIcons?: number
}

const MAX_VISIBLE_ICONS = 6

export const SupportedNetworks = ({
  assetId,
  maxIcons = MAX_VISIBLE_ICONS,
}: SupportedNetworksProps) => {
  const translate = useTranslate()

  const relatedAssetIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusive(state, relatedAssetIdsFilter),
  )
  const assetsById = useAppSelector(selectAssets)

  const chainData = useMemo(
    () => getUniqueChainDataFromAssetIds(relatedAssetIds, assetsById),
    [relatedAssetIds, assetsById],
  )

  const visibleChains = chainData.slice(0, maxIcons)
  const remainingCount = chainData.length - maxIcons

  const remainingBg = useColorModeValue('gray.100', 'gray.700')

  if (!chainData.length) return null

  return (
    <Flex direction='column' align='center' gap={2}>
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
      <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
        {translate('modals.receive.supportedNetworks')}
      </Text>
    </Flex>
  )
}
