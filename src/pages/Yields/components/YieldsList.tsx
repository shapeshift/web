import { SearchIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stat,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { ResultsEmptyNoWallet } from '@/components/ResultsEmptyNoWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { YIELD_NETWORK_TO_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldNetwork } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { YieldAssetCard, YieldAssetCardSkeleton } from '@/pages/Yields/components/YieldAssetCard'
import {
  YieldAssetGroupRow,
  YieldAssetGroupRowSkeleton,
} from '@/pages/Yields/components/YieldAssetGroupRow'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import type { SortOption } from '@/pages/Yields/components/YieldFilters'
import { YieldFilters } from '@/pages/Yields/components/YieldFilters'
import { YieldOpportunityStats } from '@/pages/Yields/components/YieldOpportunityStats'
import { YieldTable } from '@/pages/Yields/components/YieldTable'
import { ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'

import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectPortfolioUserCurrencyBalances } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const YieldsList = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tabIndex = tabParam === 'my-positions' ? 1 : 0

  const handleTabChange = (index: number) => {
    setSearchParams(prev => {
      if (index === 0) {
        prev.delete('tab')
      } else {
        prev.set('tab', 'my-positions')
      }
      return prev
    })
  }
  const selectedNetwork = searchParams.get('network')
  const selectedProvider = searchParams.get('provider')
  const sortOption = (searchParams.get('sort') as SortOption) || 'apy-desc'
  const [searchQuery, setSearchQuery] = useState('')

  const filterOption = searchParams.get('filter')
  const isMyOpportunities = filterOption === 'my-assets'
  const userCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)

  const handleToggleMyOpportunities = () => {
    if (isMyOpportunities) {
      searchParams.delete('filter')
    } else {
      searchParams.set('filter', 'my-assets')
    }
    setSearchParams(searchParams)
  }

  const {
    data: yields,
    isFetching: isLoading,
    error,
  } = useYields({
    network: selectedNetwork || undefined,
    provider: selectedProvider || undefined,
  })

  // TODO: Multi-account support - currently defaulting to account 0
  const { data: allBalances, isFetching: isLoadingBalances } = useAllYieldBalances()

  const [positionsSorting, setPositionsSorting] = useState<SortingState>([
    { id: 'apy', desc: true },
  ])

  const { data: yieldProviders } = useYieldProviders()

  const getProviderLogo = useCallback(
    (providerId: string) => {
      return yieldProviders?.[providerId]?.logoURI
    },
    [yieldProviders],
  )

  const handleNetworkChange = useCallback(
    (network: string | null) => {
      setSearchParams(prev => {
        if (!network) {
          prev.delete('network')
        } else {
          prev.set('network', network)
        }
        return prev
      })
    },
    [setSearchParams],
  )

  const handleProviderChange = useCallback(
    (provider: string | null) => {
      setSearchParams(prev => {
        if (!provider) {
          prev.delete('provider')
        } else {
          prev.set('provider', provider)
        }
        return prev
      })
    },
    [setSearchParams],
  )

  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSearchParams(prev => {
        prev.set('sort', option)
        return prev
      })
    },
    [setSearchParams],
  )

  // Sync table sorting with URL sort param
  useEffect(() => {
    switch (sortOption) {
      case 'apy-desc':
        setPositionsSorting([{ id: 'apy', desc: true }])
        break
      case 'apy-asc':
        setPositionsSorting([{ id: 'apy', desc: false }])
        break
      case 'tvl-desc':
        setPositionsSorting([{ id: 'tvl', desc: true }])
        break
      case 'tvl-asc':
        setPositionsSorting([{ id: 'tvl', desc: false }])
        break
      case 'name-asc':
        setPositionsSorting([{ id: 'pool', desc: false }])
        break
      default:
        break
    }
  }, [sortOption])

  // Derived filter options
  const networks = useMemo(() => {
    if (!yields?.meta?.networks) return []
    return yields.meta.networks.map(net => ({
      id: net,
      name: net.charAt(0).toUpperCase() + net.slice(1),
      chainId: YIELD_NETWORK_TO_CHAIN_ID[net as YieldNetwork],
    }))
  }, [yields])

  const providers = useMemo(() => {
    if (!yields?.meta?.providers) return []
    return yields.meta.providers.map(pId => ({
      id: pId,
      name: pId.charAt(0).toUpperCase() + pId.slice(1),
      icon: getProviderLogo(pId),
    }))
  }, [yields, getProviderLogo])

  const displayYields = useMemo(() => {
    if (!yields?.all) return []
    let data = yields.all

    if (isMyOpportunities) {
      data = data.filter(y => {
        const hasInputBalance = y.inputTokens?.some(t => {
          const bal = userCurrencyBalances[t.assetId || '']
          return bnOrZero(bal).gt(0)
        })
        if (hasInputBalance) return true
        const bal = userCurrencyBalances[y.token.assetId || '']
        return bnOrZero(bal).gt(0)
      })
    }

    if (selectedNetwork) {
      data = data.filter(y => y.network === selectedNetwork)
    }
    if (selectedProvider) {
      data = data.filter(y => y.providerId === selectedProvider)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(
        y =>
          y.metadata.name.toLowerCase().includes(q) ||
          y.token.symbol.toLowerCase().includes(q) ||
          y.token.name.toLowerCase().includes(q) ||
          y.providerId.toLowerCase().includes(q),
      )
    }
    return data
  }, [
    yields,
    selectedNetwork,
    selectedProvider,
    searchQuery,
    isMyOpportunities,
    userCurrencyBalances,
  ])

  // Group yields by Asset symbol locally using pre-calculated metadata
  const yieldsByAsset = useMemo(() => {
    if (!displayYields || !yields?.meta?.assetMetadata) return []
    const groups: Record<string, AugmentedYieldDto[]> = {}

    displayYields.forEach(y => {
      const token = y.inputTokens?.[0] || y.token
      const symbol = token.symbol
      if (!symbol) return

      if (!groups[symbol]) {
        groups[symbol] = []
      }
      groups[symbol].push(y)
    })

    const assetGroups = Object.entries(groups).map(([symbol, groupYields]) => {
      const meta = yields.meta.assetMetadata[symbol] || {
        assetName: symbol,
        assetIcon: '',
        assetId: undefined,
      }

      // Calculate aggregated balance and stats for this group for sorting
      let userGroupBalanceUsd = bnOrZero(0)
      let maxApy = 0
      let totalTvlUsd = bnOrZero(0)

      groupYields.forEach(y => {
        // Balance
        if (allBalances) {
          const balances = allBalances[y.id]
          if (balances) {
            balances.forEach(b => {
              userGroupBalanceUsd = userGroupBalanceUsd.plus(bnOrZero(b.amountUsd))
            })
          }
        }

        // APY
        const apy = bnOrZero(y.rewardRate.total).toNumber()
        if (apy > maxApy) maxApy = apy

        // TVL
        totalTvlUsd = totalTvlUsd.plus(bnOrZero(y.statistics?.tvlUsd))
      })

      return {
        yields: groupYields,
        assetSymbol: symbol,
        assetName: meta.assetName,
        assetIcon: meta.assetIcon,
        assetId: meta.assetId,
        userGroupBalanceUsd,
        maxApy,
        totalTvlUsd,
      }
    })

    // Sort the groups
    return assetGroups.sort((a, b) => {
      switch (sortOption) {
        case 'apy-desc':
          return b.maxApy - a.maxApy
        case 'apy-asc':
          return a.maxApy - b.maxApy
        case 'tvl-desc':
          return b.totalTvlUsd.minus(a.totalTvlUsd).toNumber()
        case 'tvl-asc':
          return a.totalTvlUsd.minus(b.totalTvlUsd).toNumber()
        case 'name-asc':
          return a.assetName.localeCompare(b.assetName)
        case 'name-desc':
          return b.assetName.localeCompare(a.assetName)
        default:
          return 0
      }
    })
  }, [displayYields, yields, allBalances, sortOption])

  const myPositions = useMemo(() => {
    if (!yields?.all || !allBalances) return []
    // Start with all positions
    const positions = yields.all.filter(yieldItem => {
      const balances = allBalances[yieldItem.id]
      if (!balances) return false
      return balances.some(b => bnOrZero(b.amount).gt(0))
    })

    // Apply cumulative filters to positions too
    return positions.filter(y => {
      if (selectedNetwork && y.network !== selectedNetwork) return false
      if (selectedProvider && y.providerId !== selectedProvider) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !y.metadata.name.toLowerCase().includes(q) &&
          !y.token.symbol.toLowerCase().includes(q) &&
          !y.token.name.toLowerCase().includes(q) &&
          !y.providerId.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [yields, allBalances, selectedNetwork, selectedProvider, searchQuery])

  const handleYieldClick = useCallback(
    (yieldId: string) => {
      let url = `/yields/${yieldId}`

      const balances = allBalances?.[yieldId]
      if (balances && balances.length > 0) {
        const highestAmountValidator = balances[0].highestAmountUsdValidator
        if (highestAmountValidator) {
          url += `?validator=${highestAmountValidator}`
        }
      }

      navigate(url)
    },
    [navigate, allBalances],
  )

  const handleRowClick = useCallback(
    (row: import('@tanstack/react-table').Row<AugmentedYieldDto>) => {
      if (!row.original.status.enter) return
      handleYieldClick(row.original.id)
    },
    [handleYieldClick],
  )

  const columns = useMemo<ColumnDef<AugmentedYieldDto>[]>(
    () => [
      {
        header: translate('yieldXYZ.yield'),
        id: 'pool',
        accessorFn: row => row.metadata.name,
        enableSorting: true,
        sortingFn: 'alphanumeric',
        cell: ({ row }) => {
          const iconSource = resolveYieldInputAssetIcon(row.original)
          return (
            <HStack spacing={4} minW='200px'>
              {iconSource.assetId ? (
                <AssetIcon assetId={iconSource.assetId} size='sm' />
              ) : (
                <AssetIcon src={iconSource.src} size='sm' />
              )}
              <Box>
                <Text fontWeight='bold' fontSize='sm' noOfLines={1} lineHeight='shorter'>
                  {row.original.metadata.name}
                </Text>
                <HStack spacing={1}>
                  {row.original.chainId && <ChainIcon chainId={row.original.chainId} size='2xs' />}
                  <HStack spacing={1}>
                    <Avatar
                      src={getProviderLogo(row.original.providerId)}
                      size='2xs'
                      name={row.original.providerId}
                    />
                    <Text fontSize='xs' color='text.subtle' textTransform='capitalize'>
                      {row.original.providerId}
                    </Text>
                  </HStack>
                </HStack>
              </Box>
            </HStack>
          )
        },
        meta: {
          display: { base: 'table-cell' },
        },
      },
      {
        header: translate('yieldXYZ.apy'),
        id: 'apy',
        accessorFn: row => row.rewardRate.total,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = bnOrZero(rowA.original.rewardRate.total).toNumber()
          const b = bnOrZero(rowB.original.rewardRate.total).toNumber()
          return a === b ? 0 : a > b ? 1 : -1
        },
        cell: ({ row }) => {
          const apy = bnOrZero(row.original.rewardRate.total).times(100).toNumber()
          return (
            <Stat size='sm'>
              <StatNumber fontSize='md' fontWeight='bold' color='green.400' lineHeight='1'>
                {apy.toFixed(2)}%
              </StatNumber>
              <Text fontSize='xs' color='text.subtle'>
                {row.original.rewardRate.rateType}
              </Text>
            </Stat>
          )
        },
        meta: {
          display: { base: 'table-cell' },
        },
      },
      {
        header: translate('yieldXYZ.tvl'),
        id: 'tvl',
        accessorFn: row => row.statistics?.tvlUsd,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = bnOrZero(rowA.original.statistics?.tvlUsd).toNumber()
          const b = bnOrZero(rowB.original.statistics?.tvlUsd).toNumber()
          return a === b ? 0 : a > b ? 1 : -1
        },
        cell: ({ row }) => (
          <Box>
            <Text fontWeight='semibold' fontSize='sm'>
              <Amount.Fiat value={row.original.statistics?.tvlUsd ?? '0'} abbreviated />
            </Text>
            <Text fontSize='xs' color='text.subtle'>
              TVL
            </Text>
          </Box>
        ),
        meta: {
          display: { base: 'none', md: 'table-cell' },
        },
      },
    ],
    [translate, getProviderLogo],
  )

  const positionsTable = useReactTable({
    data: myPositions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    enableSorting: true,
    state: { sorting: positionsSorting },
    onSortingChange: setPositionsSorting,
  })

  return (
    <Container maxW='1200px' py={8}>
      <Box mb={8}>
        <Heading as='h2' size='xl' mb={2}>
          {translate('yieldXYZ.pageTitle')}
        </Heading>
        <Text color='text.subtle'>{translate('yieldXYZ.pageSubtitle')}</Text>
      </Box>

      {error && (
        <Box mb={8} p={4} bg='red.900' borderRadius='md'>
          <Text color='red.200'>Error loading yields: {String(error)}</Text>
        </Box>
      )}

      <YieldOpportunityStats
        positions={myPositions}
        balances={allBalances}
        allYields={yields?.all}
        isMyOpportunities={isMyOpportunities}
        onToggleMyOpportunities={handleToggleMyOpportunities}
      />

      <Tabs
        variant='soft-rounded'
        colorScheme='blue'
        isLazy
        index={tabIndex}
        onChange={handleTabChange}
      >
        <TabList mb={4} gap={4}>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>{translate('common.all')}</Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            {translate('yieldXYZ.myPosition')} ({myPositions.length})
          </Tab>
        </TabList>

        <Flex
          justify='space-between'
          align='center'
          mb={6}
          gap={4}
          direction={{ base: 'column', md: 'row' }}
        >
          <InputGroup maxW={{ base: 'full', md: '300px' }} size='md'>
            <InputLeftElement pointerEvents='none'>
              <SearchIcon color='gray.500' />
            </InputLeftElement>
            <Input
              placeholder={translate('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              borderRadius='full'
              bg={useColorModeValue('white', 'gray.800')}
            />
          </InputGroup>

          <HStack
            spacing={4}
            width={{ base: 'full', md: 'auto' }}
            justify={{ base: 'space-between', md: 'flex-end' }}
          >
            <YieldFilters
              networks={networks}
              selectedNetwork={selectedNetwork}
              onSelectNetwork={handleNetworkChange}
              providers={providers}
              selectedProvider={selectedProvider}
              onSelectProvider={handleProviderChange}
              sortOption={sortOption}
              onSortChange={handleSortChange}
              mb={0}
            />
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </HStack>
        </Flex>

        <TabPanels>
          {/* All Yields Tab */}
          <TabPanel px={0}>
            {isLoading ? (
              viewMode === 'grid' ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <YieldAssetCardSkeleton key={i} />
                  ))}
                </SimpleGrid>
              ) : (
                <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <YieldAssetGroupRowSkeleton key={i} />
                  ))}
                </Box>
              )
            ) : yieldsByAsset.length === 0 ? (
              <Box textAlign='center' py={16}>
                <Text color='text.subtle'>{translate('yieldXYZ.noYields')}</Text>
              </Box>
            ) : viewMode === 'grid' ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {yieldsByAsset.map(group => (
                  <YieldAssetCard
                    key={group.assetSymbol}
                    assetSymbol={group.assetSymbol}
                    assetName={group.assetName}
                    assetIcon={group.assetIcon}
                    assetId={group.assetId}
                    yields={group.yields}
                    userGroupBalanceUsd={group.userGroupBalanceUsd}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                {yieldsByAsset.map(group => (
                  <YieldAssetGroupRow
                    key={group.assetSymbol}
                    assetSymbol={group.assetSymbol}
                    assetName={group.assetName}
                    assetIcon={group.assetIcon}
                    assetId={group.assetId}
                    yields={group.yields}
                    userGroupBalanceUsd={group.userGroupBalanceUsd}
                  />
                ))}
              </Box>
            )}
          </TabPanel>

          {/* My Positions Tab */}
          <TabPanel px={0}>
            {!isConnected ? (
              <ResultsEmptyNoWallet
                title='yieldXYZ.connectWallet'
                body='Connect a wallet to view your active yield positions.'
              />
            ) : isLoading || isLoadingBalances ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <YieldCardSkeleton key={i} />
                ))}
              </SimpleGrid>
            ) : myPositions.length > 0 ? (
              viewMode === 'grid' ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {positionsTable.getRowModel().rows.map(row => (
                    <YieldCard
                      key={row.id}
                      yield={row.original}
                      onEnter={() => handleYieldClick(row.original.id)}
                      providerIcon={getProviderLogo(row.original.providerId)}
                      userBalanceUsd={
                        allBalances?.[row.original.id]
                          ? allBalances[row.original.id].reduce(
                            (sum, b) => sum.plus(bnOrZero(b.amountUsd)),
                            bnOrZero(0),
                          )
                          : undefined
                      }
                    />
                  ))}
                </SimpleGrid>
              ) : (
                <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                  <YieldTable
                    key={positionsSorting.map(s => `${s.id}-${s.desc}`).join(',')}
                    table={positionsTable}
                    isLoading={false}
                    onRowClick={handleRowClick}
                  />
                </Box>
              )
            ) : (
              <Box textAlign='center' py={16} bg='whiteAlpha.50' borderRadius='xl'>
                <Text color='text.subtle' mb={2}>
                  {translate('yieldXYZ.noYields')}
                </Text>
                <Text fontSize='sm' color='text.subtle'>
                  You do not have any active yield positions.
                </Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}
