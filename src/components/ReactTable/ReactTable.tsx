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
import { Fragment, useCallback, useMemo, useRef } from 'react'
import type { Column, Row, TableState } from 'react-table'
import { useExpanded, usePagination, useSortBy, useTable } from 'react-table'
import { RawText } from 'components/Text'

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  rowDataTestKey?: keyof T
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  initialState?: Partial<TableState<{}>>
  renderSubComponent?: (row: Row<T>) => ReactNode
  renderEmptyComponent?: () => ReactNode
  isLoading?: boolean
  variant?: TableProps['variant']
}

const tdStyle = { padding: 0 }
const tdStyle2 = { paddingLeft: 4, paddingRight: 4 }
const tableSize = { base: 'sm', md: 'md' }

const arrowBackIcon = <ArrowBackIcon />
const arrowForwardIcon = <ArrowForwardIcon />

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
}: ReactTableProps<T>) => {
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
    },
    useSortBy,
    useExpanded,
    usePagination,
  )
  const renderRows = useMemo(() => {
    return page.map(row => {
      prepareRow(row)
      return (
        <Fragment key={row.id}>
          <Tr
            {...row.getRowProps()}
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
    page,
    prepareRow,
    rowDataTestKey,
    rowDataTestPrefix,
    onRowClick,
    renderSubComponent,
    visibleColumns.length,
  ])

  const scrollToTableTop = useCallback(() => {
    if (tableRef.current) {
      const scrollY = tableRef.current.offsetTop - 80
      window.scrollTo(0, scrollY)
    }
  }, [])

  const handlePrevious = useCallback(() => {
    previousPage()
    scrollToTableTop()
  }, [previousPage, scrollToTableTop])

  const handleNext = useCallback(() => {
    nextPage()
    scrollToTableTop()
  }, [nextPage, scrollToTableTop])

  return (
    <Table ref={tableRef} variant={variant} size={tableSize} {...getTableProps()}>
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
                          <ArrowDownIcon ml={2} aria-label='sorted descending' />
                        ) : (
                          <ArrowUpIcon ml={2} aria-label='sorted ascending' />
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
      {page.length === 0 && !isLoading && renderEmptyComponent && (
        <Tfoot>
          <Tr>
            <Td colSpan={visibleColumns.length} py={0}>
              {renderEmptyComponent()}
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
                  onClick={handlePrevious}
                  variant='ghost'
                  aria-label='Previous Page'
                />
                <RawText fontSize='sm'>{`${pageIndex + 1} of ${pageOptions.length}`}</RawText>
                <IconButton
                  icon={arrowForwardIcon}
                  size='sm'
                  isDisabled={!canNextPage}
                  onClick={handleNext}
                  variant='ghost'
                  aria-label='Next Page'
                />
              </Flex>
            </Td>
          </Tr>
        </Tfoot>
      )}
    </Table>
  )
}
