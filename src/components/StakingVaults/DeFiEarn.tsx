import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import type { JSX } from 'react'
import { useMemo, useState } from 'react'

import { GlobalFilter } from './GlobalFilter'
import { useFetchOpportunities } from './hooks/useFetchOpportunities'
import { useYieldAsOpportunities } from './hooks/useYieldAsOpportunities'
import type { PositionTableProps, UnifiedOpportunity } from './PositionTable'
import { PositionTable } from './PositionTable'

import { ChainDropdown } from '@/components/ChainDropdown/ChainDropdown'
import { knownChainIds } from '@/constants/chains'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  selectAggregatedEarnOpportunitiesByAssetId,
  selectWalletConnectedChainIdsSorted,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery' | 'data' | 'isLoading'>
  header?: JSX.Element
  forceCompactView?: boolean
} & FlexProps

const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexPaddingX = { base: 2, xl: 0 }
const globalFilterFlexMaxWidth = { base: '100%', md: '300px' }
const tablePx = { base: 0, md: 0 }

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  header,
  forceCompactView,
  ...rest
}) => {
  const {
    state: { isConnected },
  } = useWallet()
  const { q } = useQuery<{ q?: string }>()
  const [searchQuery, setSearchQuery] = useState(q ?? '')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()

  const isYieldXyzEnabled = useFeatureFlag('YieldXyz')

  const chainIdsFromWallet = useAppSelector(state =>
    isConnected ? selectWalletConnectedChainIdsSorted(state) : knownChainIds,
  )

  const { isLoading: isOpportunitiesLoading } = useFetchOpportunities()
  const legacyPositions = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByAssetId(state, { chainId: undefined }),
  )

  const { data: yieldOpportunities, isLoading: isYieldLoading } =
    useYieldAsOpportunities(isYieldXyzEnabled)

  const mergedData: UnifiedOpportunity[] = useMemo(() => {
    const map = new Map<string, UnifiedOpportunity>()

    if (isYieldXyzEnabled && yieldOpportunities) {
      yieldOpportunities.forEach(item => {
        map.set(item.assetId, item)
      })
    }

    legacyPositions.forEach(item => {
      if (!map.has(item.assetId)) {
        map.set(item.assetId, item as UnifiedOpportunity)
      }
    })

    return Array.from(map.values()).sort((a, b) =>
      bnOrZero(b.fiatAmount).minus(bnOrZero(a.fiatAmount)).toNumber(),
    )
  }, [isYieldXyzEnabled, legacyPositions, yieldOpportunities])

  const chainIds = useMemo(() => {
    if (!isYieldXyzEnabled || !yieldOpportunities?.length) return chainIdsFromWallet
    const yieldChainIds = yieldOpportunities
      .map(item => fromAssetId(item.assetId).chainId)
      .filter(Boolean)
    return Array.from(new Set([...chainIdsFromWallet, ...yieldChainIds]))
  }, [chainIdsFromWallet, isYieldXyzEnabled, yieldOpportunities])

  const isLoading = isOpportunitiesLoading || (isYieldXyzEnabled && isYieldLoading)

  return (
    <Flex width='full' flexDir='column' gap={6}>
      <Flex
        justifyContent='space-between'
        alignItems='center'
        gap={4}
        flexWrap='wrap'
        flexDir={flexDir}
        px={flexPaddingX}
        {...rest}
      >
        {header && header}
        <Flex alignItems='center' gap={4} px={2}>
          <ChainDropdown
            chainIds={chainIds}
            chainId={selectedChainId}
            onClick={setSelectedChainId}
            showAll
            includeBalance
          />
          <Flex flex={1} maxWidth={globalFilterFlexMaxWidth} width='full' gap={4}>
            <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
          </Flex>
        </Flex>
      </Flex>
      <Box px={tablePx}>
        <PositionTable
          chainId={selectedChainId}
          searchQuery={searchQuery}
          forceCompactView={forceCompactView}
          data={mergedData}
          isLoading={isLoading}
          {...positionTableProps}
        />
      </Box>
    </Flex>
  )
}
