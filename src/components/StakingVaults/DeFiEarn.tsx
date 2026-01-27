import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Flex, Tooltip } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import type { JSX } from 'react'
import { memo, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { GlobalFilter } from './GlobalFilter'
import { useFetchOpportunities } from './hooks/useFetchOpportunities'
import { useYieldAsOpportunities } from './hooks/useYieldAsOpportunities'
import type { PositionTableProps, UnifiedOpportunity } from './PositionTable'
import { PositionTable } from './PositionTable'

import { ChainDropdown } from '@/components/ChainDropdown/ChainDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
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

export const DeFiEarn = memo(
  ({ positionTableProps, header, forceCompactView, ...rest }: DefiEarnProps) => {
    const translate = useTranslate()
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
        const existing = map.get(item.assetId)
        if (existing) {
          const mergedFiatAmount = bnOrZero(existing.fiatAmount)
            .plus(bnOrZero(item.fiatAmount))
            .toFixed(2)
          const mergedApy = bnOrZero(existing.apy).gt(bnOrZero(item.apy)) ? existing.apy : item.apy
          map.set(item.assetId, {
            ...existing,
            fiatAmount: mergedFiatAmount,
            apy: mergedApy,
            opportunities: {
              staking: [...existing.opportunities.staking, ...item.opportunities.staking],
              lp: [...existing.opportunities.lp, ...item.opportunities.lp],
            },
          })
        } else {
          map.set(item.assetId, item as UnifiedOpportunity)
        }
      })

      return Array.from(map.values()).sort((a, b) => {
        const balanceDiff = bnOrZero(b.fiatAmount).minus(bnOrZero(a.fiatAmount)).toNumber()
        if (balanceDiff !== 0) return balanceDiff
        return bnOrZero(b.apy).minus(bnOrZero(a.apy)).toNumber()
      })
    }, [isYieldXyzEnabled, legacyPositions, yieldOpportunities])

    const chainIds = useMemo(() => {
      if (!isYieldXyzEnabled || !yieldOpportunities?.length) return chainIdsFromWallet
      const yieldChainIds = yieldOpportunities
        .map(item => fromAssetId(item.assetId).chainId)
        .filter(Boolean)
      return Array.from(new Set([...chainIdsFromWallet, ...yieldChainIds]))
    }, [chainIdsFromWallet, isYieldXyzEnabled, yieldOpportunities])

    const isTableLoading = isYieldXyzEnabled ? isYieldLoading : isOpportunitiesLoading

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
            <Flex
              flex={1}
              maxWidth={globalFilterFlexMaxWidth}
              width='full'
              gap={4}
              alignItems='center'
            >
              <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
              {isOpportunitiesLoading && (
                <Tooltip label={translate('defi.loadingMorePositions')}>
                  <CircularProgress size='5' />
                </Tooltip>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Box px={tablePx}>
          <PositionTable
            chainId={selectedChainId}
            searchQuery={searchQuery}
            forceCompactView={forceCompactView}
            data={mergedData}
            isLoading={isTableLoading}
            {...positionTableProps}
          />
        </Box>
      </Flex>
    )
  },
)
