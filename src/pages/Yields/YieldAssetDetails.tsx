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
  useMediaQuery,
} from '@chakra-ui/react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { Display } from '@/components/Display'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  FIGMENT_VALIDATOR_LOGO,
  FIGMENT_VALIDATOR_NAME,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
  YIELD_NETWORK_TO_CHAIN_ID,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldNetwork } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { YieldAccountSwitcher } from '@/pages/Yields/components/YieldAccountSwitcher'
import { YieldFilters } from '@/pages/Yields/components/YieldFilters'
import { YieldItem, YieldItemSkeleton } from '@/pages/Yields/components/YieldItem'
import { YieldTable } from '@/pages/Yields/components/YieldTable'
import { ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'
import { useYieldFilters } from '@/pages/Yields/hooks/useYieldFilters'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
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
  const [isMobile] = useMediaQuery('(max-width: 768px)')
  const [searchParams, setSearchParams] = useSearchParams()
  const { accountId, setAccountId } = useYieldAccount()

  const handleAccountChange = useCallback(
    (newAccountId: string) => {
      setAccountId(newAccountId)
    },
    [setAccountId],
  )

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
  const {
    selectedNetwork,
    selectedProvider,
    sortOption,
    selectedType,
    sorting,
    setSorting,
    handleNetworkChange,
    handleProviderChange,
    handleTypeChange,
    handleSortChange,
  } = useYieldFilters()

  const { data: yields, isLoading } = useYields()
  const { data: yieldProviders } = useYieldProviders()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const { data: allBalancesData } = useAllYieldBalances()
  const allBalances = allBalancesData?.byYieldId

  const getProviderLogo = useCallback(
    (providerId: string) => yieldProviders?.[providerId]?.logoURI,
    [yieldProviders],
  )

  const getYieldDisplayInfo = useCallback(
    (yieldItem: AugmentedYieldDto) => {
      const isNativeStaking =
        yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection

      if (yieldItem.id === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID) {
        return {
          name: SHAPESHIFT_VALIDATOR_NAME,
          logoURI: SHAPESHIFT_VALIDATOR_LOGO,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }
      if (
        yieldItem.id === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID ||
        (yieldItem.id.includes('solana') && yieldItem.id.includes('native'))
      ) {
        return {
          name: FIGMENT_VALIDATOR_NAME,
          logoURI: FIGMENT_VALIDATOR_LOGO,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }
      if (isNativeStaking) {
        return {
          name: yieldItem.metadata.name,
          logoURI: yieldItem.metadata.logoURI,
          title: translate('yieldXYZ.nativeStaking'),
        }
      }
      const provider = yieldProviders?.[yieldItem.providerId]
      return { name: provider?.name, logoURI: provider?.logoURI }
    },
    [translate, yieldProviders],
  )

  const assetYields = useMemo(
    () => (yields?.byAssetSymbol && decodedSymbol ? yields.byAssetSymbol[decodedSymbol] || [] : []),
    [yields, decodedSymbol],
  )

  // Networks available for THIS asset - since we're on an asset-specific page,
  // we show only networks that have yields for this particular asset (not all global networks)
  const networks = useMemo(
    () =>
      Array.from(new Set(assetYields.map(y => y.network))).map(net => ({
        id: net,
        name: net.charAt(0).toUpperCase() + net.slice(1),
        chainId: YIELD_NETWORK_TO_CHAIN_ID[net as YieldNetwork],
      })),
    [assetYields],
  )

  // Providers available for THIS asset - shows only providers that offer yields for this asset
  const providers = useMemo(
    () =>
      Array.from(new Set(assetYields.map(y => y.providerId))).map(pId => ({
        id: pId,
        name: pId.charAt(0).toUpperCase() + pId.slice(1),
        icon: getProviderLogo(pId),
      })),
    [assetYields, getProviderLogo],
  )

  // Types available for THIS asset
  const types = useMemo(
    () =>
      Array.from(new Set(assetYields.map(y => y.mechanics.type))).map(type => ({
        id: type,
        name: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' '),
      })),
    [assetYields],
  )

  const filteredYields = useMemo(
    () =>
      assetYields.filter(y => {
        if (selectedNetwork && y.network !== selectedNetwork) return false
        if (selectedProvider && y.providerId !== selectedProvider) return false
        if (selectedType && y.mechanics.type !== selectedType) return false
        return true
      }),
    [assetYields, selectedNetwork, selectedProvider, selectedType],
  )

  const assetInfo = useMemo(() => {
    const group = yields?.assetGroups?.find(g => g.symbol === decodedSymbol)
    if (!group) return null
    return { assetName: group.name, assetIcon: group.icon, assetId: group.assetId }
  }, [yields?.assetGroups, decodedSymbol])

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
                {translate('yieldXYZ.tvl')}
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

  const sortedRows = table.getSortedRowModel().rows

  const handleYieldClick = useCallback(
    (yieldId: string) => {
      const balances = allBalances?.[yieldId]
      const highestAmountValidator = balances?.[0]?.highestAmountUsdValidator
      const url = highestAmountValidator
        ? `/yields/${yieldId}?validator=${highestAmountValidator}`
        : `/yields/${yieldId}`
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
      <Box mb={8}>
        <Flex
          alignItems={{ base: 'flex-start', md: 'center' }}
          justifyContent='space-between'
          gap={4}
          direction={{ base: 'column', md: 'row' }}
        >
          <Flex alignItems='center' gap={4}>
            <AssetIcon
              {...(assetInfo.assetId
                ? { assetId: assetInfo.assetId }
                : { src: assetInfo.assetIcon })}
              size='lg'
              showNetworkIcon={false}
            />
            <Box>
              <Heading size='lg'>
                {translate('yieldXYZ.assetYields', { asset: assetInfo.assetName })}
              </Heading>
            </Box>
          </Flex>
          <Display.Desktop>
            <YieldAccountSwitcher accountId={accountId} onChange={handleAccountChange} />
          </Display.Desktop>
        </Flex>
        <Display.Mobile>
          <Box mt={4}>
            <YieldAccountSwitcher accountId={accountId} onChange={handleAccountChange} />
          </Box>
        </Display.Mobile>
      </Box>
    )
  }, [assetInfo, translate, accountId, handleAccountChange])

  const loadingGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 6 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <YieldItemSkeleton key={i} variant={isMobile ? 'mobile' : 'card'} />
        ))}
      </SimpleGrid>
    ),
    [isMobile],
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
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 6 }}>
        {sortedRows.map(row => {
          const displayInfo = getYieldDisplayInfo(row.original)
          return (
            <YieldItem
              key={row.original.id}
              data={{
                type: 'single',
                yieldItem: row.original,
                providerIcon: displayInfo.logoURI,
                providerName: displayInfo.name,
              }}
              variant={isMobile ? 'mobile' : 'card'}
              onEnter={() => handleYieldClick(row.original.id)}
              titleOverride={displayInfo.title}
              userBalanceUsd={
                allBalances?.[row.original.id]
                  ? allBalances[row.original.id].reduce(
                      (sum, b) => sum.plus(bnOrZero(b.amountUsd)),
                      bnOrZero(0),
                    )
                  : undefined
              }
            />
          )
        })}
      </SimpleGrid>
    ),
    [allBalances, getYieldDisplayInfo, handleYieldClick, isMobile, sortedRows],
  )

  const listViewElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        <YieldTable table={table} isLoading={false} onRowClick={handleRowClick} />
      </Box>
    ),
    // sortedRows needed to trigger re-memoization when filtered data changes (table ref is stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleRowClick, sortedRows, table],
  )

  // Force grid view (which renders mobile cards) on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode

  const contentElement = useMemo(() => {
    if (isLoading) return effectiveViewMode === 'grid' ? loadingGridElement : loadingListElement
    if (filteredYields.length === 0)
      return <Text>{translate('yieldXYZ.noYieldsMatchingFilters')}</Text>
    return effectiveViewMode === 'grid' ? gridViewElement : listViewElement
  }, [
    filteredYields.length,
    gridViewElement,
    isLoading,
    listViewElement,
    loadingGridElement,
    loadingListElement,
    translate,
    effectiveViewMode,
  ])

  return (
    <Container maxW='1200px' py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
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
        justify='flex-end'
        align={{ base: 'stretch', md: 'center' }}
        mb={6}
        gap={4}
        direction={{ base: 'column', md: 'row' }}
        width='full'
        display={isMobile ? 'none' : 'flex'}
      >
        <YieldFilters
          networks={networks}
          selectedNetwork={selectedNetwork}
          onSelectNetwork={handleNetworkChange}
          providers={providers}
          selectedProvider={selectedProvider}
          onSelectProvider={handleProviderChange}
          types={types}
          selectedType={selectedType}
          onSelectType={handleTypeChange}
          sortOption={sortOption}
          onSortChange={handleSortChange}
        />
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </Flex>
      {contentElement}
    </Container>
  )
})
