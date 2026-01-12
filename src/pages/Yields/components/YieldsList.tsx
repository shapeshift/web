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
} from '@chakra-ui/react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { memo, useCallback, useMemo, useState } from 'react'
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
import { resolveYieldInputAssetIcon, searchYields } from '@/lib/yieldxyz/utils'
import { YieldFilters } from '@/pages/Yields/components/YieldFilters'
import { YieldItem, YieldItemSkeleton } from '@/pages/Yields/components/YieldItem'
import { YieldOpportunityStats } from '@/pages/Yields/components/YieldOpportunityStats'
import { YieldTable } from '@/pages/Yields/components/YieldTable'
import { ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'
import { useYieldFilters } from '@/pages/Yields/hooks/useYieldFilters'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import {
  selectPortfolioUserCurrencyBalances,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const tabSelectedSx = { color: 'white', bg: 'blue.500' }

export const YieldsList = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state: walletState } = useWallet()
  const isConnected = useMemo(() => Boolean(walletState.walletInfo), [walletState.walletInfo])
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = useMemo(() => searchParams.get('tab'), [searchParams])
  const tabIndex = useMemo(() => (tabParam === 'my-positions' ? 1 : 0), [tabParam])
  const filterOption = useMemo(() => searchParams.get('filter'), [searchParams])
  const isMyOpportunities = useMemo(() => filterOption === 'my-assets', [filterOption])
  const viewParam = useMemo(() => searchParams.get('view'), [searchParams])
  const viewMode = useMemo<'grid' | 'list'>(
    () => (viewParam === 'list' ? 'list' : 'grid'),
    [viewParam],
  )
  const setViewMode = useCallback(
    (mode: 'grid' | 'list') => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (mode === 'grid') next.delete('view')
        else next.set('view', mode)
        return next
      })
    },
    [setSearchParams],
  )
  const [searchQuery, setSearchQuery] = useState('')
  const filterSearchString = useMemo(() => searchParams.toString(), [searchParams])

  const {
    selectedNetwork,
    selectedProvider,
    sortOption,
    sorting: positionsSorting,
    setSorting: setPositionsSorting,
    handleNetworkChange,
    handleProviderChange,
    handleSortChange,
  } = useYieldFilters()

  const userCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const {
    data: yields,
    isFetching: isLoading,
    error,
  } = useYields({
    network: selectedNetwork || undefined,
    provider: selectedProvider || undefined,
  })

  // TODO: Multi-account support - currently defaulting to account 0
  const { data: allBalancesData, isFetching: isLoadingBalances } = useAllYieldBalances()
  const allBalances = allBalancesData?.byYieldId
  const { data: yieldProviders } = useYieldProviders()

  const handleTabChange = useCallback(
    (index: number) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (index === 0) next.delete('tab')
        else next.set('tab', 'my-positions')
        return next
      })
    },
    [setSearchParams],
  )

  const handleToggleMyOpportunities = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (isMyOpportunities) next.delete('filter')
      else next.set('filter', 'my-assets')
      return next
    })
  }, [isMyOpportunities, setSearchParams])

  const getProviderLogo = useCallback(
    (providerId: string) => yieldProviders?.[providerId]?.logoURI,
    [yieldProviders],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  )

  const networks = useMemo(
    () =>
      yields?.meta?.networks
        ? yields.meta.networks.map(net => ({
            id: net,
            name: net.charAt(0).toUpperCase() + net.slice(1),
            chainId: YIELD_NETWORK_TO_CHAIN_ID[net as YieldNetwork],
          }))
        : [],
    [yields],
  )

  const providers = useMemo(
    () =>
      yields?.meta?.providers
        ? yields.meta.providers.map(pId => ({
            id: pId,
            name: pId.charAt(0).toUpperCase() + pId.slice(1),
            icon: getProviderLogo(pId),
          }))
        : [],
    [yields, getProviderLogo],
  )

  const yieldsByAsset = useMemo(() => {
    if (!yields?.assetGroups) return []

    const hasUserBalance = (y: AugmentedYieldDto) => {
      if (y.inputTokens?.some(t => bnOrZero(userCurrencyBalances[t.assetId || '']).gt(0)))
        return true
      return bnOrZero(userCurrencyBalances[y.token.assetId || '']).gt(0)
    }

    return yields.assetGroups
      .map(group => {
        let filteredYields = group.yields
        if (isMyOpportunities) filteredYields = filteredYields.filter(hasUserBalance)
        if (selectedNetwork)
          filteredYields = filteredYields.filter(y => y.network === selectedNetwork)
        if (selectedProvider)
          filteredYields = filteredYields.filter(y => y.providerId === selectedProvider)
        if (searchQuery) filteredYields = searchYields(filteredYields, searchQuery)

        if (filteredYields.length === 0) return null

        const userGroupBalanceUsd = filteredYields.reduce((acc, y) => {
          const balances = allBalances?.[y.id]
          if (!balances) return acc
          return balances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), acc)
        }, bnOrZero(0))

        return {
          yields: filteredYields,
          assetSymbol: group.symbol,
          assetName: group.name,
          assetIcon: group.icon,
          assetId: group.assetId,
          userGroupBalanceUsd,
          maxApy: Math.max(0, ...filteredYields.map(y => y.rewardRate.total)),
          totalTvlUsd: filteredYields.reduce(
            (acc, y) => acc.plus(bnOrZero(y.statistics?.tvlUsd)),
            bnOrZero(0),
          ),
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0
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
      }) as {
      yields: AugmentedYieldDto[]
      assetSymbol: string
      assetName: string
      assetIcon: string
      assetId: string | undefined
      userGroupBalanceUsd: ReturnType<typeof bnOrZero>
      maxApy: number
      totalTvlUsd: ReturnType<typeof bnOrZero>
    }[]
  }, [
    yields?.assetGroups,
    isMyOpportunities,
    selectedNetwork,
    selectedProvider,
    searchQuery,
    allBalances,
    sortOption,
    userCurrencyBalances,
  ])

  const myPositions = useMemo(() => {
    if (!yields?.all || !allBalances) return []
    const positions = yields.all.filter(yieldItem => {
      const balances = allBalances[yieldItem.id]
      if (!balances) return false
      return balances.some(b => bnOrZero(b.amount).gt(0))
    })

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
      const balances = allBalances?.[yieldId]
      const highestAmountValidator = balances?.[0]?.highestAmountUsdValidator
      const url = highestAmountValidator
        ? `/yields/${yieldId}?validator=${highestAmountValidator}`
        : `/yields/${yieldId}`
      navigate(url)
    },
    [navigate, allBalances],
  )

  const handleRowClick = useCallback(
    (row: Row<AugmentedYieldDto>) => {
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
        accessorFn: row => row.token.symbol,
        enableSorting: true,
        sortingFn: 'alphanumeric',
        cell: ({ row }) => {
          const iconSource = resolveYieldInputAssetIcon(row.original)
          return (
            <HStack spacing={4} minW='150px'>
              {iconSource.assetId ? (
                <AssetIcon assetId={iconSource.assetId} size='sm' />
              ) : (
                <AssetIcon src={iconSource.src} size='sm' />
              )}
              <Box>
                <Text fontWeight='bold' fontSize='sm' noOfLines={1} lineHeight='shorter'>
                  {row.original.token.symbol}
                </Text>
                {row.original.chainId && (
                  <HStack spacing={1}>
                    <ChainIcon chainId={row.original.chainId} size='2xs' />
                  </HStack>
                )}
              </Box>
            </HStack>
          )
        },
        meta: { display: { base: 'table-cell' } },
      },
      {
        header: translate('yieldXYZ.provider'),
        id: 'provider',
        accessorFn: row => row.providerId,
        enableSorting: true,
        sortingFn: 'alphanumeric',
        cell: ({ row }) => (
          <HStack spacing={2}>
            <Avatar
              src={getProviderLogo(row.original.providerId)}
              size='xs'
              name={row.original.providerId}
            />
            <Text fontSize='sm' textTransform='capitalize'>
              {row.original.providerId}
            </Text>
          </HStack>
        ),
        meta: { display: { base: 'none', md: 'table-cell' } },
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
        meta: { display: { base: 'table-cell' } },
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
        cell: ({ row }) => {
          const tvlUserCurrency = bnOrZero(row.original.statistics?.tvlUsd)
            .times(userCurrencyToUsdRate)
            .toFixed()
          return (
            <Box>
              <Text fontWeight='semibold' fontSize='sm'>
                <Amount.Fiat value={tvlUserCurrency} abbreviated />
              </Text>
              <Text fontSize='xs' color='text.subtle'>
                TVL
              </Text>
            </Box>
          )
        },
        meta: { display: { base: 'none', md: 'table-cell' } },
      },
      {
        header: translate('yieldXYZ.yourBalance'),
        id: 'balance',
        accessorFn: row => {
          const balances = allBalances?.[row.id]
          if (!balances) return 0
          return balances
            .reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
            .toNumber()
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const balancesA = allBalances?.[rowA.original.id]
          const balancesB = allBalances?.[rowB.original.id]
          const a = balancesA
            ? balancesA.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0)).toNumber()
            : 0
          const b = balancesB
            ? balancesB.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0)).toNumber()
            : 0
          return a === b ? 0 : a > b ? 1 : -1
        },
        cell: ({ row }) => {
          const balances = allBalances?.[row.original.id]
          const totalUsd = balances
            ? balances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
            : bnOrZero(0)
          if (totalUsd.lte(0)) return null
          const totalUserCurrency = totalUsd.times(userCurrencyToUsdRate).toFixed()
          return (
            <Text fontWeight='bold' fontSize='sm' color='blue.400'>
              <Amount.Fiat value={totalUserCurrency} abbreviated />
            </Text>
          )
        },
        meta: { display: { base: 'none', lg: 'table-cell' } },
      },
    ],
    [translate, getProviderLogo, allBalances, userCurrencyToUsdRate],
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

  const errorElement = useMemo(() => {
    if (!error) return null
    return (
      <Box mb={8} p={4} bg='red.900' borderRadius='md'>
        <Text color='red.200'>Error loading yields: {String(error)}</Text>
      </Box>
    )
  }, [error])

  const allYieldsLoadingGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {Array.from({ length: 6 }).map((_, i) => (
          <YieldItemSkeleton key={i} variant='card' />
        ))}
      </SimpleGrid>
    ),
    [],
  )

  const allYieldsLoadingListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        {Array.from({ length: 8 }).map((_, i) => (
          <YieldItemSkeleton key={i} variant='row' />
        ))}
      </Box>
    ),
    [],
  )

  const allYieldsEmptyElement = useMemo(
    () => (
      <Box textAlign='center' py={16}>
        <Text color='text.subtle'>{translate('yieldXYZ.noYields')}</Text>
      </Box>
    ),
    [translate],
  )

  const allYieldsGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {yieldsByAsset.map(group => (
          <YieldItem
            key={group.assetSymbol}
            data={{
              type: 'group',
              assetSymbol: group.assetSymbol,
              assetName: group.assetName,
              assetIcon: group.assetIcon,
              assetId: group.assetId,
              yields: group.yields,
            }}
            variant='card'
            userBalanceUsd={group.userGroupBalanceUsd}
            searchString={filterSearchString}
          />
        ))}
      </SimpleGrid>
    ),
    [filterSearchString, yieldsByAsset],
  )

  const allYieldsListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        <Flex
          p={4}
          alignItems='center'
          gap={4}
          borderBottomWidth='1px'
          borderColor='inherit'
          bg='background.surface.raised.base'
        >
          <Flex flex='1' minW='200px'>
            <Text fontSize='xs' fontWeight='bold' color='text.subtle' textTransform='uppercase'>
              {translate('yieldXYZ.asset')}
            </Text>
          </Flex>
          <Flex gap={8} flex='2'>
            <Box minW='100px'>
              <Text fontSize='xs' fontWeight='bold' color='text.subtle' textTransform='uppercase'>
                {translate('yieldXYZ.maxApy')}
              </Text>
            </Box>
            <Box minW='120px' display={{ base: 'none', md: 'block' }}>
              <Text fontSize='xs' fontWeight='bold' color='text.subtle' textTransform='uppercase'>
                {translate('yieldXYZ.tvl')}
              </Text>
            </Box>
            <Box minW='120px' display={{ base: 'none', lg: 'block' }}>
              <Text fontSize='xs' fontWeight='bold' color='text.subtle' textTransform='uppercase'>
                {translate('yieldXYZ.providers')}
              </Text>
            </Box>
            <Box flex='1' display={{ base: 'none', md: 'block' }} textAlign='right'>
              <Text fontSize='xs' fontWeight='bold' color='text.subtle' textTransform='uppercase'>
                {translate('yieldXYZ.myBalance')}
              </Text>
            </Box>
          </Flex>
        </Flex>
        {yieldsByAsset.map(group => (
          <YieldItem
            key={group.assetSymbol}
            data={{
              type: 'group',
              assetSymbol: group.assetSymbol,
              assetName: group.assetName,
              assetIcon: group.assetIcon,
              assetId: group.assetId,
              yields: group.yields,
            }}
            variant='row'
            userBalanceUsd={group.userGroupBalanceUsd}
            searchString={filterSearchString}
          />
        ))}
      </Box>
    ),
    [filterSearchString, translate, yieldsByAsset],
  )

  const allYieldsContentElement = useMemo(() => {
    if (isLoading)
      return viewMode === 'grid' ? allYieldsLoadingGridElement : allYieldsLoadingListElement
    if (yieldsByAsset.length === 0) return allYieldsEmptyElement
    return viewMode === 'grid' ? allYieldsGridElement : allYieldsListElement
  }, [
    allYieldsEmptyElement,
    allYieldsGridElement,
    allYieldsListElement,
    allYieldsLoadingGridElement,
    allYieldsLoadingListElement,
    isLoading,
    viewMode,
    yieldsByAsset.length,
  ])

  const positionsLoadingElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {Array.from({ length: 3 }).map((_, i) => (
          <YieldItemSkeleton key={i} variant='card' />
        ))}
      </SimpleGrid>
    ),
    [],
  )

  const positionsEmptyElement = useMemo(
    () => (
      <Box textAlign='center' py={16} bg='background.surface.raised.base' borderRadius='xl'>
        <Text color='text.subtle' mb={2}>
          {translate('yieldXYZ.noYields')}
        </Text>
        <Text fontSize='sm' color='text.subtle'>
          {translate('yieldXYZ.noActivePositions')}
        </Text>
      </Box>
    ),
    [translate],
  )

  const positionsGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {positionsTable.getRowModel().rows.map(row => (
          <YieldItem
            key={row.id}
            data={{
              type: 'single',
              yieldItem: row.original,
              providerIcon: getProviderLogo(row.original.providerId),
            }}
            variant='card'
            onEnter={() => handleYieldClick(row.original.id)}
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
    ),
    [allBalances, getProviderLogo, handleYieldClick, positionsTable],
  )

  const positionsListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        <YieldTable
          key={positionsSorting.map(s => `${s.id}-${s.desc}`).join(',')}
          table={positionsTable}
          isLoading={false}
          onRowClick={handleRowClick}
        />
      </Box>
    ),
    [handleRowClick, positionsSorting, positionsTable],
  )

  const positionsContentElement = useMemo(() => {
    if (!isConnected)
      return (
        <ResultsEmptyNoWallet
          title='yieldXYZ.connectWallet'
          body='yieldXYZ.connectWalletPositions'
        />
      )
    if (isLoading || isLoadingBalances) return positionsLoadingElement
    if (myPositions.length > 0)
      return viewMode === 'grid' ? positionsGridElement : positionsListElement
    return positionsEmptyElement
  }, [
    isConnected,
    isLoading,
    isLoadingBalances,
    myPositions.length,
    positionsEmptyElement,
    positionsGridElement,
    positionsListElement,
    positionsLoadingElement,
    viewMode,
  ])

  return (
    <Container maxW='1200px' py={8}>
      <Box mb={8}>
        <Heading as='h2' size='xl' mb={2}>
          {translate('yieldXYZ.pageTitle')}
        </Heading>
        <Text color='text.subtle'>{translate('yieldXYZ.pageSubtitle')}</Text>
      </Box>
      {errorElement}
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
          <Tab _selected={tabSelectedSx}>{translate('common.all')}</Tab>
          <Tab _selected={tabSelectedSx}>
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
              <SearchIcon color='text.subtle' />
            </InputLeftElement>
            <Input
              placeholder={translate('common.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              borderRadius='full'
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
          <TabPanel px={0}>{allYieldsContentElement}</TabPanel>
          <TabPanel px={0}>{positionsContentElement}</TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
})
