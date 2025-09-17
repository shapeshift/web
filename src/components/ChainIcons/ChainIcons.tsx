import { Box, Circle, useColorModeValue } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { forwardRef, useMemo } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainIconsProps = {
  chainIds: ChainId[]
  maxVisible?: number
  size?: number | string
}

const DEFAULT_MAX_VISIBLE = 4

export const ChainIcons = forwardRef<HTMLDivElement, ChainIconsProps>(
  ({ chainIds, maxVisible = DEFAULT_MAX_VISIBLE, size = 5 }, ref) => {
    const assetsById = useAppSelector(selectAssets)
    const chainAdapterManager = getChainAdapterManager()
    const remainingBg = useColorModeValue('gray.100', 'gray.700')

    const chainData = useMemo(() => {
      return chainIds
        .map(chainId => {
          const chainAdapter = chainAdapterManager.get(chainId)
          const feeAssetId = chainAdapter?.getFeeAssetId()
          const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined

          return {
            chainId,
            icon: feeAsset?.networkIcon ?? feeAsset?.icon,
            name: chainAdapter?.getDisplayName() ?? chainId,
          }
        })
        .filter(chain => chain.icon) // Only show chains with icons
    }, [chainIds, chainAdapterManager, assetsById])

    const visibleChains = chainData.slice(0, maxVisible)
    const remainingCount = chainData.length - maxVisible

    if (!chainData.length) return null

    return (
      <Box ref={ref} display='inline-flex' alignItems='center'>
        {visibleChains.map((chain, index) => (
          <Box key={chain.chainId} ml={index === 0 ? 0 : -1.5} zIndex={index}>
            <LazyLoadAvatar boxSize={size} src={chain.icon} />
          </Box>
        ))}
        {remainingCount > 0 && (
          <Circle
            size={size}
            bg={remainingBg}
            color='text.base'
            fontSize='2xs'
            fontWeight='medium'
            ml={-1.5}
            zIndex={visibleChains.length}
          >
            +{remainingCount}
          </Circle>
        )}
      </Box>
    )
  },
)
