import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stat,
  StatNumber,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ColumnDef, Row, SortingState, Table as TanstackTable } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { ChainIcon } from '@/components/ChainMenu'
import { AssetIcon } from '@/components/AssetIcon'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { formatLargeNumber } from '@/lib/utils/formatters'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { YieldCard, YieldCardSkeleton } from '@/pages/Yields/components/YieldCard'
import { YieldOverview } from '@/pages/Yields/components/YieldOverview'
import { ViewToggle } from '@/pages/Yields/components/YieldViewHelpers'
import { YieldDetail } from '@/pages/Yields/YieldDetail'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'

type YieldColumnMeta = {
  display?: Record<string, string>
  textAlign?: 'left' | 'right' | 'center'
  justifyContent?: string
}

export const Yields = () => {
  return (
    <Routes>
      <Route index element={<YieldsList />} />
      {/* More specific routes must come BEFORE general :yieldId route */}
      <Route path=':yieldId/enter' element={<YieldDetail />} />
      <Route path=':yieldId/exit' element={<YieldDetail />} />
      <Route path=':yieldId' element={<YieldDetail />} />
    </Routes>
  )
}

const tableSize = { base: 'sm', md: 'md' }

const YieldTable = ({
  table,
  isLoading,
  onRowClick,
}: {
  table: TanstackTable<AugmentedYieldDto>
  isLoading: boolean
  onRowClick: (row: Row<AugmentedYieldDto>) => void
}) => {
  const hoverBg = useColorModeValue('gray.50', 'gray.750')
  const hoverColor = useColorModeValue('black', 'white')
  const columns = table.getAllColumns()

  return (
    <Table variant='simple' size={tableSize}>
      <Thead>
        {table.getHeaderGroups().map(headerGroup => (
          <Tr key={headerGroup.id}>
            {headerGroup.headers.map(header => {
              const meta = header.column.columnDef.meta as YieldColumnMeta | undefined
              const canSort = header.column.getCanSort()
              const sortingState = header.column.getIsSorted()
              const sortingHandler = header.column.getToggleSortingHandler()
              return (
                <Th
                  key={header.id}
                  display={meta?.display}
                  textAlign={meta?.textAlign}
                  cursor={canSort ? 'pointer' : undefined}
                  onClick={canSort ? sortingHandler : undefined}
                  _hover={canSort ? { color: hoverColor } : undefined}
                >
                  <Flex
                    justifyContent={meta?.justifyContent}
                    alignItems='center'
                    pointerEvents='auto'
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {sortingState ? (
                      sortingState === 'desc' ? (
                        <ArrowDownIcon ml={2} aria-label='sorted descending' />
                      ) : (
                        <ArrowUpIcon ml={2} aria-label='sorted ascending' />
                      )
                    ) : null}
                  </Flex>
                </Th>
              )
            })}
          </Tr>
        ))}
      </Thead>
      <Tbody>
        {isLoading
          ? Array.from({ length: 6 }).map((_, rowIndex) => (
            <Tr key={rowIndex}>
              {columns.map(column => (
                <Td key={`${rowIndex}-${column.id}`}>
                  <Skeleton height='16px' />
                </Td>
              ))}
            </Tr>
          ))
          : table.getRowModel().rows.map(row => {
            const isClickable = row.original.status.enter
            return (
              <Tr
                key={row.id}
                cursor={isClickable ? 'pointer' : undefined}
                onClick={() => {
                  if (!isClickable) return
                  onRowClick(row)
                }}
                _hover={isClickable ? { bg: hoverBg } : undefined}
              >
                {row.getVisibleCells().map(cell => {
                  const meta = cell.column.columnDef.meta as YieldColumnMeta | undefined
                  return (
                    <Td key={cell.id} display={meta?.display} textAlign={meta?.textAlign}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  )
                })}
              </Tr>
            )
          })}
      </Tbody>
    </Table>
  )
}

const YieldsList = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state: walletState } = useWallet()
  const isConnected = Boolean(walletState.walletInfo)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { data: yields, isLoading, error } = useYields({ network: 'base' })
  const { data: allBalances, isLoading: isLoadingBalances } = useAllYieldBalances()
  const [allSorting, setAllSorting] = useState<SortingState>([])
  const [positionsSorting, setPositionsSorting] = useState<SortingState>([])

  const { data: yieldProviders } = useYieldProviders()

  const getProviderLogo = useCallback(
    (providerId: string) => {
      return yieldProviders?.find(p => p.id === providerId)?.logoURI
    },
    [yieldProviders],
  )

  const connectedYields = useMemo(() => {
    if (!isConnected || !yields) return []
    return yields
  }, [isConnected, yields])

  const myPositions = useMemo(() => {
    if (!connectedYields || !allBalances) return []
    return connectedYields.filter(yieldItem => {
      const balances = allBalances[yieldItem.id]
      if (!balances) return false
      // Check if any balance type has > 0 amount
      return balances.some(b => bnOrZero(b.amount).gt(0))
    })
  }, [connectedYields, allBalances])

  const handleYieldClick = useCallback(
    (yieldId: string) => {
      navigate(`/yields/${yieldId}`)
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
        accessorFn: row => row.metadata.name,
        enableSorting: true,
        sortingFn: 'alphanumeric',
        cell: ({ row }) => (
          <HStack spacing={4} minW='200px'>
            <AssetIcon
              src={row.original.metadata.logoURI}
              assetId={row.original.token.assetId}
              showNetworkIcon
              size='sm'
            />
            <Box>
              <Text fontWeight='bold' fontSize='sm' noOfLines={1} lineHeight='shorter'>
                {row.original.metadata.name}
              </Text>
              <HStack spacing={1}>
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
        ),
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
              {formatLargeNumber(row.original.statistics?.tvlUsd ?? '0', '$')}
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
      {
        header: translate('yieldXYZ.type') ?? 'Type',
        id: 'tags',
        accessorFn: row => row.tags,
        enableSorting: false,
        cell: ({ row }) => {
          const visibleTags = row.original.tags
            .filter(tag => tag !== row.original.network && tag !== 'vault' && tag.length < 15)
            .slice(0, 2)
          return (
            <HStack spacing={2} justify='flex-end'>
              {visibleTags.map((tag, idx) => (
                <Badge key={idx} variant='outline' fontSize='xs' borderRadius='md'>
                  {tag}
                </Badge>
              ))}
            </HStack>
          )
        },
        meta: {
          display: { base: 'none', lg: 'table-cell' },
          textAlign: 'right',
          justifyContent: 'flex-end',
        },
      },
    ],
    [translate, getProviderLogo],
  )

  const allTable = useReactTable({
    data: connectedYields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id,
    enableSorting: true,
    state: { sorting: allSorting },
    onSortingChange: setAllSorting,
  })

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

  if (!isConnected) {
    return (
      <Container maxW='1200px' py={8}>
        <Box textAlign='center' py={16}>
          <Heading as='h2' size='xl' mb={4}>
            {translate('yieldXYZ.pageTitle')}
          </Heading>
          <Text color='text.subtle' mb={8} maxW='md' mx='auto'>
            {translate('yieldXYZ.connectWallet')}
          </Text>
        </Box>
      </Container>
    )
  }

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

      {myPositions.length > 0 && <YieldOverview positions={myPositions} balances={allBalances} />}

      <Tabs variant='soft-rounded' colorScheme='blue' isLazy>
        <TabList mb={6}>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>{translate('common.all')}</Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>
            {translate('yieldXYZ.myPosition')} ({myPositions.length})
          </Tab>
        </TabList>

        <TabPanels>
          {/* All Yields Tab */}
          <TabPanel px={0}>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {viewMode === 'grid' ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <YieldCardSkeleton key={i} />)
                  : allTable
                    .getRowModel()
                    .rows.map(row => (
                      <YieldCard
                        key={row.id}
                        yield={row.original}
                        onEnter={() => handleYieldClick(row.original.id)}
                        providerIcon={getProviderLogo(row.original.providerId)}
                      />
                    ))}
              </SimpleGrid>
            ) : (
              <Box borderWidth='1px' borderRadius='xl' overflow='hidden'>
                <YieldTable
                  key={allSorting.map(s => `${s.id}-${s.desc}`).join(',')}
                  table={allTable}
                  isLoading={isLoading}
                  onRowClick={handleRowClick}
                />
              </Box>
            )}

            {!isLoading && connectedYields.length === 0 && (
              <Box textAlign='center' py={16}>
                <Text color='text.subtle'>{translate('yieldXYZ.noYields')}</Text>
              </Box>
            )}
          </TabPanel>

          {/* My Positions Tab */}
          <TabPanel px={0}>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

            {isLoading || isLoadingBalances ? (
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
