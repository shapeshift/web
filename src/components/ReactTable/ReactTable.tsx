import { ArrowBackIcon, ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { TableProps } from '@chakra-ui/react'
import {
  Flex,
  IconButton,
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
import { Fragment, useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Cell, Column, ColumnInstance, Row, TableState } from 'react-table'
import { useExpanded, usePagination, useSortBy, useTable } from 'react-table'
import { RawText } from 'components/Text'

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  rowDataTestKey?: keyof T
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  initialState?: Partial<TableState<T>>
  renderSubComponent?: (row: Row<T>) => ReactNode
  renderEmptyComponent?: () => ReactNode
  isLoading?: boolean
  variant?: TableProps['variant']
  onPageChange?: (page: Row<T>[]) => void
}

const tdStyle = { padding: 0 }
const tdStyle2 = { paddingLeft: 4, paddingRight: 4 }
const tableSize = { base: 'sm', md: 'md' }

const arrowBackIcon = <ArrowBackIcon />
const arrowForwardIcon = <ArrowForwardIcon />

const CellWrap = <T extends {}>({ cell }: { cell: Cell<T, unknown> }) => {
  const cellProps = useMemo(() => cell.getCellProps(), [cell])
  const dataLabel = useMemo(() => {
    return typeof cell.column.Header === 'string' ? cell.column.Header : undefined
  }, [cell.column.Header])

  return (
    <Td
      {...cellProps}
      data-label={dataLabel}
      display={cell.column.display}
      textAlign={cell.column.textAlign}
      key={cell.column.id}
    >
      {cell.render('Cell')}
    </Td>
  )
}

const RowWrap = <T extends {}>({
  row,
  rowDataTestKey,
  rowDataTestPrefix,
  onRowClick,
  renderSubComponent,
  visibleColumns,
}: {
  row: Row<T>
  rowDataTestKey: string | number | symbol | undefined
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  renderSubComponent?: (row: Row<T>) => React.ReactNode
  visibleColumns: ColumnInstance<T>[]
}) => {
  const handleClick = useCallback(() => {
    onRowClick?.(row)
  }, [onRowClick, row])

  const rowProps = useMemo(() => row.getRowProps(), [row])

  const dataTest = useMemo(() => {
    if (!rowDataTestKey) return undefined
    const value =
      (row.original as Record<string, unknown> | undefined)?.[rowDataTestKey as string] ?? ''
    return `${rowDataTestPrefix}-${String(value).split(' ').join('-').toLowerCase()}`
  }, [row.original, rowDataTestKey, rowDataTestPrefix])

  return (
    <Fragment>
      <Tr
        {...rowProps}
        key={row.id}
        tabIndex={row.index}
        onClick={handleClick}
        className={row.isExpanded ? 'expanded' : ''}
        data-test={dataTest}
        cursor={onRowClick ? 'pointer' : undefined}
      >
        {row.cells.map(cell => (
          <CellWrap key={cell.column.id} cell={cell} />
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
}

export const ReactTable = <T extends {}>({
  columns,
  data,
  displayHeaders = true,
  rowDataTestKey,
  rowDataTestPrefix,
  onRowClick,
  initialState,
  renderSubComponent,
  renderEmptyComponent,
  isLoading = false,
  variant = 'default',
  onPageChange,
}: ReactTableProps<T>) => {
  const translate = useTranslate()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const hoverColor = useColorModeValue('black', 'white')
  const tableColumns = useMemo(() => {
    return isLoading
      ? columns.map((column, index) => ({
          ...column,
          Cell: () => <Skeleton key={index} height='16px' />,
        }))
      : columns
  }, [columns, isLoading])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    visibleColumns,
    pageOptions,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    state: { pageIndex },
  } = useTable<T>(
    {
      columns: tableColumns,
      data,
      initialState,
      // The following two options are needed to prevent the table from infinite render loop and crash
      // https://github.com/TanStack/table/issues/2369#issuecomment-644481605
      autoResetSortBy: false,
      autoResetPage: false,
    },
    useSortBy,
    useExpanded,
    usePagination,
  )

  useEffect(() => {
    if (!onPageChange) return

    onPageChange(page)
  }, [onPageChange, page])

  const renderedRows = useMemo(() => {
    return page.map(row => {
      prepareRow(row)
      return (
        <RowWrap
          key={row.id}
          row={row}
          rowDataTestKey={rowDataTestKey}
          rowDataTestPrefix={rowDataTestPrefix}
          onRowClick={onRowClick}
          renderSubComponent={renderSubComponent}
          visibleColumns={visibleColumns}
        />
      )
    })
  }, [
    page,
    prepareRow,
    rowDataTestKey,
    rowDataTestPrefix,
    onRowClick,
    renderSubComponent,
    visibleColumns,
  ])

  const tableBodyProps = useMemo(() => getTableBodyProps(), [getTableBodyProps])
  const tableProps = useMemo(() => getTableProps(), [getTableProps])
  const emptyComponent = useMemo(() => renderEmptyComponent?.(), [renderEmptyComponent])

  return (
    <Table ref={tableRef} variant={variant} size={tableSize} {...tableProps}>
      {displayHeaders && (
        <Thead>
          {headerGroups.map(headerGroup => (
            <Tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <Th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  color='text.subtle'
                  textAlign={column.textAlign}
                  display={column.display}
                  // we need to pass an arg here, so we need an anonymous function wrapper
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
      <Tbody {...tableBodyProps}>{renderedRows}</Tbody>
      {page.length === 0 && !isLoading && emptyComponent && (
        <Tfoot>
          <Tr>
            <Td colSpan={visibleColumns.length} py={0}>
              {emptyComponent}
            </Td>
          </Tr>
        </Tfoot>
      )}
      {(canNextPage || canPreviousPage) && (
        <Tfoot>
          <Tr>
            <Td colSpan={visibleColumns.length} style={tdStyle2}>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <IconButton
                  icon={arrowBackIcon}
                  size='sm'
                  isDisabled={!canPreviousPage}
                  onClick={previousPage}
                  variant='ghost'
                  aria-label={translate('common.table.prevPage')}
                />
                <RawText fontSize='sm'>{`${pageIndex + 1} of ${pageOptions.length}`}</RawText>
                <IconButton
                  icon={arrowForwardIcon}
                  size='sm'
                  isDisabled={!canNextPage}
                  onClick={nextPage}
                  variant='ghost'
                  aria-label={translate('common.table.nextPage')}
                />
              </Flex>
            </Td>
          </Tr>
        </Tfoot>
      )}
    </Table>
  )
}
