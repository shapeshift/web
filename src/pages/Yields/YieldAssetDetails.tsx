import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stat,
  Text,
} from '@chakra-ui/react'
import type { ColumnDef, Row, SortingState } from '@tanstack/react-table'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { YIELD_NETWORK_TO_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldNetwork } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import type { SortOption } from '@/pages/Yields/components/YieldFilters'
import { YieldFilters } from '@/pages/Yields/components/YieldFilters'
import { YieldTable } from '@/pages/Yields/components/YieldTable'
import { ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const YieldAssetDetails = memo(() => {
  const { assetId: assetSymbol } = useParams<{ assetId: string }>()
  const decodedSymbol = useMemo(() => decodeURIComponent(assetSymbol || ''), [assetSymbol])
  const navigate = useNavigate()
  const translate = useTranslate()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedNetwork = useMemo(() => searchParams.get('network'), [searchParams])
  const selectedProvider = useMemo(() => searchParams.get('provider'), [searchParams])
  const sortOption = useMemo(
    () => (searchParams.get('sort') as SortOption) || 'apy-desc',
    [searchParams],
  )
  const [sorting, setSorting] = useState<SortingState>([{ id: 'apy', desc: true }])

  const { data: yields, isLoading } = useYields()
  const { data: yieldProviders } = useYieldProviders()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const { data: allBalances } = useAllYieldBalances()

  const getProviderLogo = useCallback(
    (providerId: string) => yieldProviders?.[providerId]?.logoURI,
    [yieldProviders],
  )

  const handleNetworkChange = useCallback(
    (network: string | null) => {
      setSearchParams(prev => {
        if (!network) prev.delete('network')
        else prev.set('network', network)
        return prev
      })
    },
    [setSearchParams],
  )

  const handleProviderChange = useCallback(
    (provider: string | null) => {
      setSearchParams(prev => {
        if (!provider) prev.delete('provider')
        else prev.set('provider', provider)
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

  useEffect(() => {
    switch (sortOption) {
      case 'apy-desc':
        setSorting([{ id: 'apy', desc: true }])
        break
      case 'apy-asc':
        setSorting([{ id: 'apy', desc: false }])
        break
      case 'tvl-desc':
        setSorting([{ id: 'tvl', desc: true }])
        break
      case 'tvl-asc':
        setSorting([{ id: 'tvl', desc: false }])
        break
      case 'name-asc':
        setSorting([{ id: 'pool', desc: false }])
        break
      default:
        break
    }
  }, [sortOption])

  const assetYields = useMemo(() => {
    if (!yields?.byAssetSymbol || !decodedSymbol) return []
    return yields.byAssetSymbol[decodedSymbol] || []
  }, [yields, decodedSymbol])

  const networks = useMemo(() => {
    const unique = new Set(assetYields.map(y => y.network))
    return Array.from(unique).map(net => ({
      id: net,
      name: net.charAt(0).toUpperCase() + net.slice(1),
      chainId: YIELD_NETWORK_TO_CHAIN_ID[net as YieldNetwork],
    }))
  }, [assetYields])

  const providers = useMemo(() => {
    const unique = new Set(assetYields.map(y => y.providerId))
    return Array.from(unique).map(pId => ({
      id: pId,
      name: pId.charAt(0).toUpperCase() + pId.slice(1),
      icon: getProviderLogo(pId),
    }))
  }, [assetYields, getProviderLogo])

  const filteredYields = useMemo(() => {
    let data = assetYields
    if (selectedNetwork) data = data.filter(y => y.network === selectedNetwork)
    if (selectedProvider) data = data.filter(y => y.providerId === selectedProvider)
    return data
  }, [assetYields, selectedNetwork, selectedProvider])

  const assetInfo = useMemo(() => {
    if (!yields?.meta?.assetMetadata || !decodedSymbol) return null
    return yields.meta.assetMetadata[decodedSymbol]
  }, [yields, decodedSymbol])

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
        meta: { display: { base: 'table-cell' } },
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
              <GradientApy fontSize='md' lineHeight='1'>
                {apy.toFixed(2)}%
              </GradientApy>
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
            <Box>
              <Text fontWeight='bold' fontSize='sm' color='blue.400'>
                <Amount.Fiat value={totalUserCurrency} abbreviated />
              </Text>
            </Box>
          )
        },
        meta: { display: { base: 'none', lg: 'table-cell' } },
      },
    ],
    [translate, userCurrencyToUsdRate, getProviderLogo, allBalances],
  )

  const table = useReactTable({
    data: filteredYields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    enableSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  })

  const handleYieldClick = useCallback(
    (yieldId: string) => {
      let url = `/yields/${yieldId}`
      const balances = allBalances?.[yieldId]
      if (balances && balances.length > 0) {
        const highestAmountValidator = balances[0].highestAmountUsdValidator
        if (highestAmountValidator) url += `?validator=${highestAmountValidator}`
      }
      navigate(url)
    },
    [allBalances, navigate],
  )

  const handleRowClick = useCallback(
    (row: Row<AugmentedYieldDto>) => {
      if (!row.original.status.enter) return
      handleYieldClick(row.original.id)
    },
    [handleYieldClick],
  )

  const assetHeaderElement = useMemo(() => {
    if (!assetInfo) return null
    return (
      <Flex alignItems='center' gap={4} mb={8}>
        <AssetIcon
          {...(assetInfo.assetId ? { assetId: assetInfo.assetId } : { src: assetInfo.assetIcon })}
          size='lg'
          showNetworkIcon={false}
        />
        <Box>
          <Heading size='lg'>{assetInfo.assetName} Yields</Heading>
          <Text color='text.subtle'>{assetYields.length} opportunities available</Text>
        </Box>
      </Flex>
    )
  }, [assetInfo, assetYields.length])

  const loadingGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {Array.from({ length: 6 }).map((_, i) => (
          <YieldCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    ),
    [],
  )

  const loadingListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden' p={4}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} h='50px' mb={2} bg='gray.100' _dark={{ bg: 'gray.800' }} />
        ))}
      </Box>
    ),
    [],
  )

  const gridViewElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {table.getSortedRowModel().rows.map(row => (
          <YieldCard
            key={row.original.id}
            yieldItem={row.original}
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
    ),
    [allBalances, getProviderLogo, handleYieldClick, table],
  )

  const listViewElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        <YieldTable table={table} isLoading={false} onRowClick={handleRowClick} />
      </Box>
    ),
    [handleRowClick, table],
  )

  const contentElement = useMemo(() => {
    if (isLoading) return viewMode === 'grid' ? loadingGridElement : loadingListElement
    if (filteredYields.length === 0) return <Text>No yields found matching filters.</Text>
    return viewMode === 'grid' ? gridViewElement : listViewElement
  }, [
    filteredYields.length,
    gridViewElement,
    isLoading,
    listViewElement,
    loadingGridElement,
    loadingListElement,
    viewMode,
  ])

  return (
    <Container maxW='1200px' py={8}>
      <Button
        leftIcon={<ArrowBackIcon />}
        variant='ghost'
        onClick={() => navigate('/yields')}
        mb={6}
      >
        {translate('common.back')}
      </Button>
      {assetHeaderElement}
      <Flex
        justify='space-between'
        align='center'
        mb={6}
        gap={4}
        direction={{ base: 'column', md: 'row' }}
      >
        <Box />
        <HStack spacing={4} width={{ base: 'full', md: 'auto' }} justify='flex-end'>
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
      {contentElement}
    </Container>
  )
})
