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
import { Fragment, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, IdType, Row, TableState } from 'react-table'
import { useExpanded, useSortBy, useTable } from 'react-table'
import { useLongPress } from 'use-long-press'

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  rowDataTestKey?: keyof T
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  onRowLongPress?: (row: Row<T>) => void
  initialState?: Partial<TableState<{}>>
  renderSubComponent?: (row: Row<T>) => ReactNode
  renderEmptyComponent?: () => ReactNode
  isLoading?: boolean
  variant?: TableProps['variant']
  onSortBy?: (
    columnId: IdType<T>,
    descending?: boolean | undefined,
    isMulti?: boolean | undefined,
  ) => void
}

const tdStyle = { padding: 0 }
const tableSize = { base: 'sm', md: 'md' }

export const ReactTableNoPager = <T extends {}>({
  columns,
  data,
  displayHeaders = true,
  rowDataTestKey,
  rowDataTestPrefix,
  onRowClick,
  onRowLongPress,
  initialState,
  renderSubComponent,
  renderEmptyComponent,
  isLoading = false,
  variant = 'default',
}: ReactTableProps<T>) => {
  const translate = useTranslate()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const hoverColor = useColorModeValue('black', 'white')

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

  const longPressHandlers = useLongPress((_, { context: row }) => {
    onRowLongPress?.(row as Row<T>)
  })

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, visibleColumns } =
    useTable<T>(
      {
        columns: tableColumns,
        data,
        initialState,
      },
      useSortBy,
      useExpanded,
    )
  const renderRows = useMemo(() => {
    return rows.map(row => {
      prepareRow(row)
      return (
        <Fragment key={row.id}>
          <Tr
            {...row.getRowProps()}
            {...longPressHandlers(row)}
            key={row.id}
            tabIndex={row.index}
            // we need to pass an arg here, so we need an anonymous function wrapper
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => onRowClick?.(row)}
            className={row.isExpanded ? 'expanded' : ''}
            {...(rowDataTestKey
              ? {
                  'data-test': `${rowDataTestPrefix}-${String(row.original?.[rowDataTestKey] ?? '')
                    .split(' ')
                    .join('-')
                    .toLowerCase()}`,
                }
              : {})}
            cursor={onRowClick ? 'pointer' : undefined}
          >
            {row.cells.map(cell => (
              <Td
                {...cell.getCellProps()}
                // Header can be () => null or a string, only use data-label if it's a string
                {...(typeof cell.column.Header === 'string'
                  ? { 'data-label': cell.column.Header }
                  : undefined)}
                display={cell.column.display}
                key={cell.column.id}
              >
                {cell.render('Cell')}
              </Td>
            ))}
          </Tr>
          {!!renderSubComponent && row.isExpanded ? (
            <Tr className='expanded-details'>
              <Td colSpan={visibleColumns.length} style={tdStyle}>
                {renderSubComponent(row)}
              </Td>
            </Tr>
          ) : null}
        </Fragment>
      )
    })
  }, [
    rows,
    prepareRow,
    longPressHandlers,
    rowDataTestKey,
    rowDataTestPrefix,
    onRowClick,
    renderSubComponent,
    visibleColumns.length,
  ])

  return (
    <Table ref={tableRef} variant={variant} size={tableSize} {...getTableProps()}>
      {displayHeaders && (
        // Can't useMemo this, breaks the dynamic bits of the header sorting
        <Thead>
          {headerGroups.map(headerGroup => (
            <Tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
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
              ))}
            </Tr>
          ))}
        </Thead>
      )}
      <Tbody {...getTableBodyProps()}>{renderRows}</Tbody>
      {rows.length === 0 && !isLoading && renderEmptyComponent && (
        <Tfoot>
          <Tr>
            <Td colSpan={visibleColumns.length} py={0}>
              {renderEmptyComponent()}
            </Td>
          </Tr>
        </Tfoot>
      )}
    </Table>
  )
}
