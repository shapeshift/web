import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { TableProps } from '@chakra-ui/react'
import {
  Flex,
  Skeleton,
  Table,
  Tbody,
  Td,
  Tfoot,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row, TableState } from 'react-table'
import { useExpanded, useSortBy, useTable } from 'react-table'
import { TableVirtuoso } from 'react-virtuoso'
import { useLongPress } from 'use-long-press'

import { defaultLongPressConfig, longPressSx } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  rowDataTestKey?: keyof T
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  onRowLongPress?: (row: Row<T>) => void
  onVisibleRowsChange?: (visibleRows: T[]) => void
  initialState?: Partial<TableState<{}>>
  renderSubComponent?: (row: Row<T>) => ReactNode
  renderEmptyComponent?: () => ReactNode
  isLoading?: boolean
  variant?: TableProps['variant']
  loadMore: () => void
  hasMore: boolean
}

const tableSize = { base: 'sm', md: 'md' }
const tableStyle = { height: 'auto', minHeight: '200px' }

export const InfiniteTable = <T extends {}>({
  columns,
  data,
  displayHeaders = true,
  rowDataTestKey,
  rowDataTestPrefix,
  onRowClick,
  onRowLongPress,
  onVisibleRowsChange,
  initialState,
  renderSubComponent,
  renderEmptyComponent,
  isLoading = false,
  variant = 'default',
  hasMore,
  loadMore,
}: ReactTableProps<T>) => {
  const translate = useTranslate()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const hoverColor = useColorModeValue('black', 'white')

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const longPressHandlers = useLongPress((_, { context: row }) => {
    vibrate('heavy')
    onRowLongPress?.(row as Row<T>)
  }, defaultLongPressConfig)

  const tableColumns = useMemo(
    () =>
      isLoading
        ? columns.map((column, index) => ({
            ...column,
            Cell: () => <Skeleton key={index} height='16px' />,
          }))
        : columns,
    [columns, isLoading],
  )

  const { headerGroups, rows, prepareRow, visibleColumns } = useTable<T>(
    {
      columns: tableColumns,
      data,
      initialState,
    },
    useSortBy,
    useExpanded,
  )

  const preparedRows = useMemo(() => {
    return rows.map(row => {
      prepareRow(row)
      return row
    })
  }, [rows, prepareRow])

  const handleRangeChanged = useCallback(
    ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      if (startIndex < 0 || endIndex < startIndex) return
      const visibleRows = preparedRows.slice(startIndex, endIndex + 1)
      onVisibleRowsChange?.(visibleRows.map(row => row.original))
    },
    [preparedRows, onVisibleRowsChange],
  )

  const handleRowToggle = useCallback((rowId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }, [])

  const handleRowClick = useCallback(
    (row: Row<T>) => {
      if (renderSubComponent) {
        row.toggleRowExpanded?.()
        handleRowToggle(row.id)
      }

      onRowClick?.(row)
    },
    [renderSubComponent, handleRowToggle, onRowClick],
  )

  const renderRowContent = useCallback(
    (index: number) => {
      const row = preparedRows[index]
      if (!row) return null

      const isExpanded = expandedItems.has(row.id)

      return (
        <Fragment key={row.id}>
          {row.cells.map(cell => (
            <Td
              {...cell.getCellProps()}
              {...(typeof cell.column.Header === 'string'
                ? { 'data-label': cell.column.Header }
                : undefined)}
              display={cell.column.display}
              key={cell.column.id}
              className={isExpanded ? 'expanded' : ''}
              borderBottomRadius={isExpanded ? 0 : undefined}
            >
              {cell.render('Cell')}
            </Td>
          ))}
        </Fragment>
      )
    },
    [preparedRows, expandedItems],
  )

  const renderHeader = useCallback(() => {
    if (!displayHeaders) return null

    return headerGroups.map(headerGroup =>
      headerGroup.headers.map(column => (
        <Th
          {...column.getHeaderProps(column.getSortByToggleProps())}
          color='text.subtle'
          textAlign={column.textAlign}
          display={column.display}
          // eslint-disable-next-line react-memo/require-usememo
          _hover={{ color: column.canSort ? hoverColor : 'text.subtle' }}
        >
          <Flex justifyContent={column.justifyContent} alignItems={column.alignItems}>
            {column.render('Header')}
            <Flex alignItems='center'>
              {column.isSorted ? (
                column.isSortedDesc ? (
                  <ArrowDownIcon ml={2} aria-label={translate('common.table.sortedDesc')} />
                ) : (
                  <ArrowUpIcon ml={2} aria-label={translate('common.table.sortedAsc')} />
                )
              ) : null}
            </Flex>
          </Flex>
        </Th>
      )),
    )
  }, [displayHeaders, headerGroups, hoverColor, translate])

  const renderEmpty = useCallback(() => {
    if (data.length === 0 && !isLoading && renderEmptyComponent) {
      return (
        <Tr>
          <Td colSpan={visibleColumns.length} py={0}>
            {renderEmptyComponent()}
          </Td>
        </Tr>
      )
    }
    return null
  }, [data.length, isLoading, renderEmptyComponent, visibleColumns.length])

  const tableComponents = useMemo(
    () => ({
      Table: ({ style, ...props }: any) => (
        <Table
          ref={tableRef}
          variant={variant}
          size={tableSize}
          style={style}
          className='infinite-table'
          {...props}
        />
      ),
      TableHead: Thead,
      TableBody: Tbody,
      TableFoot: Tfoot,
      TableRow: ({ children, item, context, ...props }: any) => {
        const row = item
        const isExpanded = row ? expandedItems.has(row.id) : false

        return (
          <>
            <Tr
              {...props}
              {...longPressHandlers(row)}
              sx={longPressSx}
              tabIndex={row?.index}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleRowClick(row)}
              className={isExpanded ? 'expanded' : ''}
              bg={isExpanded ? 'background.surface.raised.base' : 'transparent'}
              borderBottomRadius={isExpanded ? 0 : 'lg'}
              {...(row && rowDataTestKey
                ? {
                    'data-test': `${rowDataTestPrefix}-${String(
                      row.original?.[rowDataTestKey] ?? '',
                    )
                      .split(' ')
                      .join('-')
                      .toLowerCase()}`,
                  }
                : {})}
              cursor={onRowClick ? 'pointer' : undefined}
            >
              {children}
            </Tr>
            {!!renderSubComponent && isExpanded && row && (
              <Tr className='expanded-details'>
                <Td colSpan={visibleColumns.length} p={'0!important'}>
                  {renderSubComponent(row)}
                </Td>
              </Tr>
            )}
          </>
        )
      },
      TableCell: Td,
      TableHeadCell: Th,
    }),
    [
      variant,
      expandedItems,
      handleRowClick,
      longPressHandlers,
      onRowClick,
      rowDataTestKey,
      rowDataTestPrefix,
      renderSubComponent,
      visibleColumns.length,
    ],
  )

  if (isLoading) {
    return (
      <Table variant={variant} size={tableSize} className='infinite-table'>
        {renderHeader()}
        <Tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <Tr key={index}>
              {columns.map((_column, colIndex) => (
                <Td key={colIndex}>
                  <Skeleton height='16px' />
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    )
  }

  return (
    <TableVirtuoso
      data={preparedRows}
      itemContent={renderRowContent}
      fixedHeaderContent={renderHeader}
      fixedFooterContent={renderEmpty}
      endReached={hasMore ? loadMore : undefined}
      components={tableComponents}
      useWindowScroll
      style={tableStyle}
      overscan={2000}
      rangeChanged={handleRangeChanged}
    />
  )
}
