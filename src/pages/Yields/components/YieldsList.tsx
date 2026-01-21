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
  useMediaQuery,
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
import { fromBaseUnit } from '@/lib/math'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  FIGMENT_SOLANA_VALIDATOR_ADDRESS,
  FIGMENT_VALIDATOR_LOGO,
  FIGMENT_VALIDATOR_NAME,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
  YIELD_NETWORK_TO_CHAIN_ID,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldNetwork } from '@/lib/yieldxyz/types'
import {
  getDefaultValidatorForYield,
  isStakingYieldType,
  isYieldDisabled,
  resolveYieldInputAssetIcon,
  searchYields,
} from '@/lib/yieldxyz/utils'
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
  selectAssets,
  selectEnabledWalletAccountIds,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioUserCurrencyBalances,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const tabSelectedSx = { color: 'white', bg: 'blue.500' }

const TAB_PARAMS = ['all', 'available', 'my-positions'] as const
type YieldTab = (typeof TAB_PARAMS)[number]

export const YieldsList = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const [isMobile] = useMediaQuery('(max-width: 768px)')
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as YieldTab | null
  const tabIndex = useMemo(() => {
    if (tabParam) {
      const idx = TAB_PARAMS.indexOf(tabParam)
      return idx >= 0 ? idx : 0
    }
    return isConnected ? 1 : 0
  }, [tabParam, isConnected])
  const isAvailableToEarnTab = tabParam === 'available' || (!tabParam && isConnected)
  const viewParam = searchParams.get('view')
  const viewMode: 'grid' | 'list' = viewParam === 'list' ? 'list' : 'grid'
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
  const filterSearchString = searchParams.toString()

  const {
    selectedNetwork,
    selectedProvider,
    selectedType,
    sortOption,
    sorting: positionsSorting,
    setSorting: setPositionsSorting,
    handleNetworkChange,
    handleProviderChange,
    handleTypeChange,
    handleSortChange,
  } = useYieldFilters(isAvailableToEarnTab)

  const userCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const assetBalancesBaseUnit = useAppSelector(selectPortfolioAssetBalancesBaseUnit)
  const assets = useAppSelector(selectAssets)
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const {
    data: yields,
    isFetching: isLoading,
    error,
  } = useYields({
    network: selectedNetwork || undefined,
    provider: selectedProvider || undefined,
  })

  const { data: allBalancesData, isFetching: isLoadingBalances } = useAllYieldBalances({
    accountIds: enabledWalletAccountIds,
  })
  const allBalances = allBalancesData?.byYieldId
  const { data: yieldProviders } = useYieldProviders()

  const handleTabChange = useCallback(
    (index: number) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('tab', TAB_PARAMS[index])
        return next
      })
    },
    [setSearchParams],
  )

  const handleNavigateToAvailableTab = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'available')
      return next
    })
  }, [setSearchParams])

  const handleNavigateToAllTab = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'all')
      return next
    })
  }, [setSearchParams])

  const getProviderLogo = useCallback(
    (providerId: string) => yieldProviders?.[providerId]?.logoURI,
    [yieldProviders],
  )

  const getYieldDisplayInfo = useCallback(
    (yieldItem: AugmentedYieldDto) => {
      const isNativeStaking =
        isStakingYieldType(yieldItem.mechanics.type) &&
        yieldItem.mechanics.requiresValidatorSelection

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

  const getYieldPositionBalanceUsd = useCallback(
    (yieldId: string) => {
      const yieldBalances = allBalances?.[yieldId]
      if (!yieldBalances) return undefined

      // For Cosmos native staking, only show ShapeShift DAO validator balance
      if (yieldId === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID) {
        const filteredBalances = yieldBalances.filter(
          b => b.validator?.address === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
        )
        if (filteredBalances.length === 0) return undefined
        return filteredBalances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
      }

      // For Solana native multivalidator staking, only show Figment validator balance
      if (yieldId === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID) {
        const filteredBalances = yieldBalances.filter(
          b => b.validator?.address === FIGMENT_SOLANA_VALIDATOR_ADDRESS,
        )
        if (filteredBalances.length === 0) return undefined
        return filteredBalances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
      }

      // For other yields, sum all balances
      return yieldBalances.reduce((sum, b) => sum.plus(bnOrZero(b.amountUsd)), bnOrZero(0))
    },
    [allBalances],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  )

  const unfilteredByInputAssetId = useMemo(() => {
    if (!yields?.unfiltered) return {}
    return yields.unfiltered.reduce<Record<string, AugmentedYieldDto[]>>((acc, item) => {
      const assetId = item.inputTokens?.[0]?.assetId
      if (assetId) {
        if (!acc[assetId]) acc[assetId] = []
        acc[assetId].push(item)
      }
      return acc
    }, {})
  }, [yields?.unfiltered])

  const unfilteredAvailableYields = useMemo(() => {
    if (!isConnected || !userCurrencyBalances || !assetBalancesBaseUnit) return []

    const available: AugmentedYieldDto[] = []

    for (const [assetId, balanceFiat] of Object.entries(userCurrencyBalances)) {
      const yieldsForAsset = unfilteredByInputAssetId[assetId]
      if (!yieldsForAsset?.length) continue

      const balance = bnOrZero(balanceFiat)
      if (balance.lte(0)) continue

      const eligibleYields = yieldsForAsset.filter(y => {
        if (isYieldDisabled(y)) return false
        const minDeposit = bnOrZero(y.mechanics?.entryLimits?.minimum)
        if (minDeposit.gt(0)) {
          const asset = assets[assetId]
          if (!asset) return false
          const baseBalance = bnOrZero(assetBalancesBaseUnit[assetId])
          const balanceHuman = bnOrZero(fromBaseUnit(baseBalance, asset.precision))
          if (balanceHuman.lt(minDeposit)) return false
        }
        return true
      })

      available.push(...eligibleYields)
    }

    return available
  }, [isConnected, unfilteredByInputAssetId, userCurrencyBalances, assetBalancesBaseUnit, assets])

  const filterSourceYields = useMemo(
    () =>
      isAvailableToEarnTab && unfilteredAvailableYields.length > 0
        ? unfilteredAvailableYields
        : undefined,
    [isAvailableToEarnTab, unfilteredAvailableYields],
  )

  const networks = useMemo(() => {
    const sourceNetworks = filterSourceYields
      ? [...new Set(filterSourceYields.map(y => y.network))]
      : yields?.meta?.networks ?? []

    return sourceNetworks.map(net => ({
      id: net,
      name: net.charAt(0).toUpperCase() + net.slice(1),
      chainId: YIELD_NETWORK_TO_CHAIN_ID[net as YieldNetwork],
    }))
  }, [filterSourceYields, yields?.meta?.networks])

  const providers = useMemo(() => {
    const sourceProviders = filterSourceYields
      ? [...new Set(filterSourceYields.map(y => y.providerId))]
      : yields?.meta?.providers ?? []

    return sourceProviders.map(pId => ({
      id: pId,
      name: pId.charAt(0).toUpperCase() + pId.slice(1),
      icon: getProviderLogo(pId),
    }))
  }, [filterSourceYields, yields?.meta?.providers, getProviderLogo])

  const types = useMemo(() => {
    const sourceYields = filterSourceYields ?? yields?.all
    if (!sourceYields) return []

    const uniqueTypes = [...new Set(sourceYields.map(y => y.mechanics.type))]
    return uniqueTypes.map(type => ({
      id: type,
      name: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' '),
    }))
  }, [filterSourceYields, yields?.all])

  const yieldsByAsset = useMemo(() => {
    if (!yields?.assetGroups) return []

    return yields.assetGroups
      .map(group => {
        let filteredYields = group.yields.filter(y => {
          if (!isYieldDisabled(y)) return true
          return bnOrZero(getYieldPositionBalanceUsd(y.id)).gt(0)
        })
        if (selectedNetwork)
          filteredYields = filteredYields.filter(y => y.network === selectedNetwork)
        if (selectedProvider)
          filteredYields = filteredYields.filter(y => y.providerId === selectedProvider)
        if (selectedType)
          filteredYields = filteredYields.filter(y => y.mechanics.type === selectedType)
        if (searchQuery) filteredYields = searchYields(filteredYields, searchQuery)

        if (filteredYields.length === 0) return null

        const userGroupBalanceUsd = filteredYields.reduce((acc, y) => {
          const balance = getYieldPositionBalanceUsd(y.id)
          if (!balance) return acc
          return acc.plus(balance)
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
    selectedNetwork,
    selectedProvider,
    selectedType,
    searchQuery,
    getYieldPositionBalanceUsd,
    sortOption,
  ])

  const recommendedYields = useMemo(() => {
    if (!unfilteredAvailableYields.length || !userCurrencyBalances) return []

    const yieldsByAssetId = unfilteredAvailableYields.reduce<Record<string, AugmentedYieldDto[]>>(
      (acc, item) => {
        const assetId = item.inputTokens?.[0]?.assetId
        if (assetId) {
          if (!acc[assetId]) acc[assetId] = []
          acc[assetId].push(item)
        }
        return acc
      },
      {},
    )

    const recommendations: {
      yield: AugmentedYieldDto
      balanceFiat: ReturnType<typeof bnOrZero>
      potentialEarnings: ReturnType<typeof bnOrZero>
    }[] = []

    for (const [assetId, yieldsForAsset] of Object.entries(yieldsByAssetId)) {
      const balance = bnOrZero(userCurrencyBalances[assetId])
      if (balance.lte(0)) continue

      const bestYield = yieldsForAsset.reduce((best, current) =>
        current.rewardRate.total > best.rewardRate.total ? current : best,
      )

      recommendations.push({
        yield: bestYield,
        balanceFiat: balance,
        potentialEarnings: balance.times(bestYield.rewardRate.total),
      })
    }

    return recommendations
      .sort((a, b) => b.potentialEarnings.minus(a.potentialEarnings).toNumber())
      .slice(0, 3)
  }, [unfilteredAvailableYields, userCurrencyBalances])

  const availableYields = useMemo(() => {
    if (!unfilteredAvailableYields.length || !userCurrencyBalances) return []

    const available: {
      yield: AugmentedYieldDto
      balanceFiat: ReturnType<typeof bnOrZero>
    }[] = []

    for (const yieldItem of unfilteredAvailableYields) {
      const inputAssetId = yieldItem.inputTokens?.[0]?.assetId
      if (!inputAssetId) continue

      const balanceFiat = bnOrZero(userCurrencyBalances[inputAssetId])

      if (selectedNetwork && yieldItem.network !== selectedNetwork) continue
      if (selectedProvider && yieldItem.providerId !== selectedProvider) continue
      if (selectedType && yieldItem.mechanics.type !== selectedType) continue
      if (searchQuery && !searchYields([yieldItem], searchQuery).length) continue

      available.push({ yield: yieldItem, balanceFiat })
    }

    return available.sort((a, b) => {
      switch (sortOption) {
        case 'yearly-return-desc': {
          const aYearlyReturn = bnOrZero(a.yield.rewardRate.total).times(a.balanceFiat)
          const bYearlyReturn = bnOrZero(b.yield.rewardRate.total).times(b.balanceFiat)
          const diff = bYearlyReturn.minus(aYearlyReturn).toNumber()
          if (diff !== 0) return diff
          return bnOrZero(b.yield.rewardRate.total).minus(a.yield.rewardRate.total).toNumber()
        }
        case 'apy-desc':
          return bnOrZero(b.yield.rewardRate.total).minus(a.yield.rewardRate.total).toNumber()
        case 'apy-asc':
          return bnOrZero(a.yield.rewardRate.total).minus(b.yield.rewardRate.total).toNumber()
        case 'tvl-desc':
          return bnOrZero(b.yield.statistics?.tvlUsd)
            .minus(a.yield.statistics?.tvlUsd ?? 0)
            .toNumber()
        case 'tvl-asc':
          return bnOrZero(a.yield.statistics?.tvlUsd)
            .minus(b.yield.statistics?.tvlUsd ?? 0)
            .toNumber()
        case 'name-asc':
          return a.yield.token.symbol.localeCompare(b.yield.token.symbol)
        case 'name-desc':
          return b.yield.token.symbol.localeCompare(a.yield.token.symbol)
        default: {
          const aYearlyReturnDefault = bnOrZero(a.yield.rewardRate.total).times(a.balanceFiat)
          const bYearlyReturnDefault = bnOrZero(b.yield.rewardRate.total).times(b.balanceFiat)
          return bYearlyReturnDefault.minus(aYearlyReturnDefault).toNumber()
        }
      }
    })
  }, [
    unfilteredAvailableYields,
    userCurrencyBalances,
    selectedNetwork,
    selectedProvider,
    selectedType,
    searchQuery,
    sortOption,
  ])

  const myPositions = useMemo(() => {
    if (!yields?.unfiltered || !allBalances) return []
    const positions = yields.unfiltered.filter(yieldItem => {
      const balances = allBalances[yieldItem.id]
      if (!balances) return false
      return balances.some(b => bnOrZero(b.amount).gt(0))
    })

    const filtered = positions.filter(y => {
      if (selectedNetwork && y.network !== selectedNetwork) return false
      if (selectedProvider && y.providerId !== selectedProvider) return false
      if (selectedType && y.mechanics.type !== selectedType) return false
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

    return filtered.sort((a, b) => {
      const aBalance =
        allBalances[a.id]?.reduce((sum, bal) => sum.plus(bnOrZero(bal.amountUsd)), bnOrZero(0)) ??
        bnOrZero(0)
      const bBalance =
        allBalances[b.id]?.reduce((sum, bal) => sum.plus(bnOrZero(bal.amountUsd)), bnOrZero(0)) ??
        bnOrZero(0)
      return bBalance.minus(aBalance).toNumber()
    })
  }, [
    yields?.unfiltered,
    allBalances,
    selectedNetwork,
    selectedProvider,
    selectedType,
    searchQuery,
  ])

  const handleYieldClick = useCallback(
    (yieldId: string) => {
      const validator = getDefaultValidatorForYield(yieldId)
      const url = validator ? `/yields/${yieldId}?validator=${validator}` : `/yields/${yieldId}`
      navigate(url)
    },
    [navigate],
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
        cell: ({ row }) => {
          const tableDisplayInfo = getYieldDisplayInfo(row.original)
          return (
            <HStack spacing={2}>
              <Avatar src={tableDisplayInfo.logoURI} size='xs' name={tableDisplayInfo.name} />
              <Text fontSize='sm' textTransform='capitalize'>
                {tableDisplayInfo.name ?? row.original.providerId}
              </Text>
            </HStack>
          )
        },
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
        header: translate('yieldXYZ.balance'),
        id: 'balance',
        accessorFn: row => {
          const balance = getYieldPositionBalanceUsd(row.id)
          return balance?.toNumber() ?? 0
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = getYieldPositionBalanceUsd(rowA.original.id)?.toNumber() ?? 0
          const b = getYieldPositionBalanceUsd(rowB.original.id)?.toNumber() ?? 0
          return a === b ? 0 : a > b ? 1 : -1
        },
        cell: ({ row }) => {
          const totalUsd = getYieldPositionBalanceUsd(row.original.id) ?? bnOrZero(0)
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
    [translate, getYieldDisplayInfo, getYieldPositionBalanceUsd, userCurrencyToUsdRate],
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
          <YieldItemSkeleton key={i} variant={isMobile ? 'mobile' : 'card'} />
        ))}
      </SimpleGrid>
    ),
    [isMobile],
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
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 6 }}>
        {yieldsByAsset.map(group => {
          if (group.yields.length === 1) {
            const singleYield = group.yields[0]
            const inputAssetId = singleYield.inputTokens?.[0]?.assetId
            const availableUsd = inputAssetId
              ? bnOrZero(userCurrencyBalances[inputAssetId])
              : undefined
            const singleDisplayInfo = getYieldDisplayInfo(singleYield)
            return (
              <YieldItem
                key={singleYield.id}
                data={{
                  type: 'single',
                  yieldItem: singleYield,
                  providerIcon: singleDisplayInfo.logoURI,
                  providerName: singleDisplayInfo.name,
                }}
                variant={isMobile ? 'mobile' : 'card'}
                userBalanceUsd={group.userGroupBalanceUsd}
                availableBalanceUserCurrency={availableUsd}
                onEnter={() => handleYieldClick(singleYield.id)}
              />
            )
          }

          return (
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
              variant={isMobile ? 'mobile' : 'card'}
              userBalanceUsd={group.userGroupBalanceUsd}
              searchString={filterSearchString}
            />
          )
        })}
      </SimpleGrid>
    ),
    [
      filterSearchString,
      yieldsByAsset,
      isMobile,
      getYieldDisplayInfo,
      handleYieldClick,
      userCurrencyBalances,
    ],
  )

  const availableToEarnGridElement = useMemo(
    () => (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 6 }}>
        {availableYields.map(item => {
          const positionBalanceUsd = getYieldPositionBalanceUsd(item.yield.id)
          const displayInfo = getYieldDisplayInfo(item.yield)
          return (
            <YieldItem
              key={item.yield.id}
              data={{
                type: 'single',
                yieldItem: item.yield,
                providerIcon: displayInfo.logoURI,
                providerName: displayInfo.name,
              }}
              variant={isMobile ? 'mobile' : 'card'}
              userBalanceUsd={positionBalanceUsd}
              availableBalanceUserCurrency={item.balanceFiat}
              onEnter={() => handleYieldClick(item.yield.id)}
              showAvailableOnly
            />
          )
        })}
      </SimpleGrid>
    ),
    [availableYields, getYieldPositionBalanceUsd, isMobile, getYieldDisplayInfo, handleYieldClick],
  )

  const listHeader = useMemo(
    () => (
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
              {translate('yieldXYZ.balance')}
            </Text>
          </Box>
        </Flex>
      </Flex>
    ),
    [translate],
  )

  const allYieldsListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        {listHeader}
        {yieldsByAsset.map(group => {
          if (group.yields.length === 1) {
            const singleYield = group.yields[0]
            const inputAssetId = singleYield.inputTokens?.[0]?.assetId
            const availableUsd = inputAssetId
              ? bnOrZero(userCurrencyBalances[inputAssetId])
              : undefined
            const rowSingleDisplayInfo = getYieldDisplayInfo(singleYield)
            return (
              <YieldItem
                key={singleYield.id}
                data={{
                  type: 'single',
                  yieldItem: singleYield,
                  providerIcon: rowSingleDisplayInfo.logoURI,
                  providerName: rowSingleDisplayInfo.name,
                }}
                variant='row'
                userBalanceUsd={group.userGroupBalanceUsd}
                availableBalanceUserCurrency={availableUsd}
                onEnter={() => handleYieldClick(singleYield.id)}
              />
            )
          }

          return (
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
          )
        })}
      </Box>
    ),
    [
      listHeader,
      filterSearchString,
      yieldsByAsset,
      getYieldDisplayInfo,
      handleYieldClick,
      userCurrencyBalances,
    ],
  )

  const availableToEarnListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        {listHeader}
        {availableYields.map(item => {
          const positionBalanceUsd = getYieldPositionBalanceUsd(item.yield.id)
          const rowDisplayInfo = getYieldDisplayInfo(item.yield)
          return (
            <YieldItem
              key={item.yield.id}
              data={{
                type: 'single',
                yieldItem: item.yield,
                providerIcon: rowDisplayInfo.logoURI,
                providerName: rowDisplayInfo.name,
              }}
              variant='row'
              userBalanceUsd={positionBalanceUsd}
              availableBalanceUserCurrency={item.balanceFiat}
              onEnter={() => handleYieldClick(item.yield.id)}
              showAvailableOnly
            />
          )
        })}
      </Box>
    ),
    [
      listHeader,
      availableYields,
      getYieldPositionBalanceUsd,
      getYieldDisplayInfo,
      handleYieldClick,
    ],
  )

  const recommendedStripElement = useMemo(() => {
    if (!isConnected || recommendedYields.length === 0) return null

    return (
      <Box mb={6}>
        <Text fontSize='lg' fontWeight='semibold' mb={4}>
          {translate('yieldXYZ.recommendedForYou')}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 2, md: 4 }}>
          {recommendedYields.map(rec => {
            const recDisplayInfo = getYieldDisplayInfo(rec.yield)
            return (
              <YieldItem
                key={rec.yield.id}
                data={{
                  type: 'single',
                  yieldItem: rec.yield,
                  providerIcon: recDisplayInfo.logoURI,
                  providerName: recDisplayInfo.name,
                }}
                variant={isMobile ? 'mobile' : 'card'}
                availableBalanceUserCurrency={rec.balanceFiat}
                onEnter={() => handleYieldClick(rec.yield.id)}
              />
            )
          })}
        </SimpleGrid>
      </Box>
    )
  }, [isConnected, recommendedYields, translate, getYieldDisplayInfo, handleYieldClick, isMobile])

  const allYieldsContentElement = useMemo(() => {
    if (isLoading)
      return viewMode === 'grid' || isMobile
        ? allYieldsLoadingGridElement
        : allYieldsLoadingListElement
    if (yieldsByAsset.length === 0) return allYieldsEmptyElement
    return viewMode === 'grid' || isMobile ? allYieldsGridElement : allYieldsListElement
  }, [
    allYieldsEmptyElement,
    allYieldsGridElement,
    allYieldsListElement,
    allYieldsLoadingGridElement,
    allYieldsLoadingListElement,
    isLoading,
    viewMode,
    yieldsByAsset.length,
    isMobile,
  ])

  const availableToEarnEmptyElement = useMemo(
    () => (
      <Box textAlign='center' py={16}>
        <Text color='text.subtle'>{translate('yieldXYZ.noAvailableYields')}</Text>
      </Box>
    ),
    [translate],
  )

  const availableToEarnContentElement = useMemo(() => {
    if (!isConnected)
      return (
        <ResultsEmptyNoWallet
          title='yieldXYZ.connectWallet'
          body='yieldXYZ.connectWalletAvailable'
        />
      )
    if (isLoading)
      return viewMode === 'grid' || isMobile
        ? allYieldsLoadingGridElement
        : allYieldsLoadingListElement
    if (availableYields.length === 0) return availableToEarnEmptyElement
    return viewMode === 'grid' || isMobile ? availableToEarnGridElement : availableToEarnListElement
  }, [
    isConnected,
    isLoading,
    viewMode,
    isMobile,
    allYieldsLoadingGridElement,
    allYieldsLoadingListElement,
    availableYields.length,
    availableToEarnEmptyElement,
    availableToEarnGridElement,
    availableToEarnListElement,
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
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 6 }}>
        {myPositions.map(position => {
          const posDisplayInfo = getYieldDisplayInfo(position)
          return (
            <YieldItem
              key={position.id}
              data={{
                type: 'single',
                yieldItem: position,
                providerIcon: posDisplayInfo.logoURI,
                providerName: posDisplayInfo.name,
              }}
              variant={isMobile ? 'mobile' : 'card'}
              onEnter={() => handleYieldClick(position.id)}
              userBalanceUsd={
                allBalances?.[position.id]
                  ? allBalances[position.id].reduce(
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
    [allBalances, getYieldDisplayInfo, handleYieldClick, myPositions, isMobile],
  )

  const positionsListElement = useMemo(
    () => (
      <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
        <YieldTable
          key={`${positionsSorting.map(s => `${s.id}-${s.desc}`).join(',')}-${
            myPositions.length
          }-${myPositions.map(p => p.id).join(',')}`}
          table={positionsTable}
          isLoading={false}
          onRowClick={handleRowClick}
        />
      </Box>
    ),
    [handleRowClick, positionsSorting, positionsTable, myPositions],
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
      return viewMode === 'grid' || isMobile ? positionsGridElement : positionsListElement
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
    isMobile,
  ])

  return (
    <Container maxW='1200px' py={8} px={{ base: 4, md: 6 }}>
      <Box mb={8}>
        <Flex
          justifyContent='space-between'
          alignItems={{ base: 'flex-start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={4}
        >
          <Box>
            <Heading as='h2' size='xl' mb={2}>
              {translate('yieldXYZ.pageTitle')}
            </Heading>
            {!isMobile && <Text color='text.subtle'>{translate('yieldXYZ.pageSubtitle')}</Text>}
          </Box>
        </Flex>
      </Box>
      {errorElement}
      {isConnected && (
        <YieldOpportunityStats
          positions={myPositions}
          balances={allBalances}
          allYields={yields?.all}
          isAvailableToEarnTab={isAvailableToEarnTab}
          onNavigateToAvailableTab={handleNavigateToAvailableTab}
          onNavigateToAllTab={handleNavigateToAllTab}
          isConnected={isConnected}
          isMobile={isMobile}
        />
      )}
      {recommendedStripElement}
      <Tabs
        variant='soft-rounded'
        colorScheme='blue'
        isLazy
        index={tabIndex}
        onChange={handleTabChange}
      >
        <TabList mb={4} gap={4}>
          <Tab _selected={tabSelectedSx}>{translate('common.all')}</Tab>
          <Tab _selected={tabSelectedSx}>{translate('yieldXYZ.availableToEarn')}</Tab>
          <Tab _selected={tabSelectedSx}>
            {translate('yieldXYZ.myPositions')} ({myPositions.length})
          </Tab>
        </TabList>
        <Flex
          justify='space-between'
          align='center'
          mb={{ base: 2, md: 4 }}
          gap={2}
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
          <Flex
            gap={4}
            width={{ base: 'full', md: 'auto' }}
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'stretch', md: 'center' }}
          >
            {!isMobile && (
              <>
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
                  mb={0}
                />
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
              </>
            )}
          </Flex>
        </Flex>
        <TabPanels>
          <TabPanel px={0}>{allYieldsContentElement}</TabPanel>
          <TabPanel px={0}>{availableToEarnContentElement}</TabPanel>
          <TabPanel px={0}>{positionsContentElement}</TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
})
