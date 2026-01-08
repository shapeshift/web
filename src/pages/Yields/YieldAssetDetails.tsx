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
import { useCallback, useEffect, useMemo, useState } from 'react'
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

export const YieldAssetDetails = () => {
  const { assetId: assetSymbol } = useParams<{ assetId: string }>()
  const decodedSymbol = decodeURIComponent(assetSymbol || '')
  const navigate = useNavigate()
  const translate = useTranslate()

  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedNetwork = searchParams.get('network')
  const selectedProvider = searchParams.get('provider')
  const sortOption = (searchParams.get('sort') as SortOption) || 'apy-desc'
  const [sorting, setSorting] = useState<SortingState>([{ id: 'apy', desc: true }])

  const { data: yields, isLoading } = useYields()
  const { data: yieldProviders } = useYieldProviders()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  // Helpers
  const getProviderLogo = useCallback(
    (providerId: string) => {
      return yieldProviders?.[providerId]?.logoURI
    },
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

  // Sync sorting
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

  // Data processing
  const assetYields = useMemo(() => {
    if (!yields?.byAssetSymbol || !decodedSymbol) return []
    return yields.byAssetSymbol[decodedSymbol] || []
  }, [yields, decodedSymbol])

  // Get user balances for navigation logic
  const { data: allBalances } = useAllYieldBalances()

  // Derive filters from the asset's yields
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
    if (selectedNetwork) {
      data = data.filter(y => y.network === selectedNetwork)
    }
    if (selectedProvider) {
      data = data.filter(y => y.providerId === selectedProvider)
    }
    return data
  }, [assetYields, selectedNetwork, selectedProvider])

  const assetInfo = useMemo(() => {
    if (!yields?.meta?.assetMetadata || !decodedSymbol) return null
    return yields.meta.assetMetadata[decodedSymbol]
  }, [yields, decodedSymbol])
  // Table Columns
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
              <GradientApy fontSize='md' lineHeight='1'>
                {apy.toFixed(2)}%
              </GradientApy>
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
        meta: {
          display: { base: 'none', md: 'table-cell' },
        },
      },
    ],
    [translate, getProviderLogo, userCurrencyToUsdRate],
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

  // Navigation
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
    [allBalances, navigate],
  )

  const handleRowClick = (row: Row<AugmentedYieldDto>) => {
    if (!row.original.status.enter) return
    handleYieldClick(row.original.id)
  }

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

      {assetInfo && (
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
      )}

      {/* Filters Toolbar */}
      <Flex
        justify='space-between'
        align='center'
        mb={6}
        gap={4}
        direction={{ base: 'column', md: 'row' }}
      >
        <Box /> {/* Spacer or Search if needed later */}
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

      {isLoading ? (
        viewMode === 'grid' ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {Array.from({ length: 6 }).map((_, i) => (
              <YieldCardSkeleton key={i} />
            ))}
          </SimpleGrid>
        ) : (
          <Box borderWidth='1px' borderRadius='xl' overflow='hidden' p={4}>
            {/* Simple skeleton list */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} h='50px' mb={2} bg='gray.100' _dark={{ bg: 'gray.800' }} />
            ))}
          </Box>
        )
      ) : filteredYields.length === 0 ? (
        <Text>No yields found matching filters.</Text>
      ) : viewMode === 'grid' ? (
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
      ) : (
        <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
          <YieldTable table={table} isLoading={false} onRowClick={handleRowClick} />
        </Box>
      )}
    </Container>
  )
}
