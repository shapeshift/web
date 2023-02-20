import { ArrowBackIcon, ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
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
import { Fragment, useMemo } from 'react'
import type { Column, Row, TableState } from 'react-table'
import { useExpanded, usePagination, useSortBy, useTable } from 'react-table'
import { RawText } from 'components/Text'

export type TableHeaderProps = {
  globalFilter: any
  setGlobalFilter: (filterValue: any) => void
}

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  rowDataTestKey?: keyof T
  rowDataTestPrefix?: string
  onRowClick?: (row: Row<T>) => void
  initialState?: Partial<TableState<{}>>
  renderSubComponent?: (row: Row<T>) => ReactNode
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
}: ReactTableProps<T>) => {
  const hoverColor = useColorModeValue('black', 'white')
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
      columns,
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
                data-label={cell.column.Header}
                display={cell.column.display}
                key={cell.column.id}
              >
                {cell.render('Cell')}
              </Td>
            ))}
          </Tr>
          {!!renderSubComponent && row.isExpanded ? (
            <Tr className='expanded-details'>
              <Td colSpan={visibleColumns.length} style={{ padding: 0 }}>
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

  return (
    <Table variant='default' size={{ base: 'sm', md: 'md' }} {...getTableProps()}>
      {displayHeaders && (
        <Thead>
          {headerGroups.map(headerGroup => (
            <Tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <Th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  color='gray.500'
                  textAlign={column.textAlign}
                  display={column.display}
                  _hover={{ color: column.canSort ? hoverColor : 'gray.500' }}
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
      {(canNextPage || canPreviousPage) && (
        <Tfoot>
          <Tr>
            <Td colSpan={visibleColumns.length} py={0}>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <IconButton
                  icon={<ArrowBackIcon />}
                  size='sm'
                  isDisabled={!canPreviousPage}
                  onClick={previousPage}
                  variant='ghost'
                  aria-label='Previous Page'
                />
                <RawText fontSize='sm'>{`${pageIndex + 1} of ${pageOptions.length}`}</RawText>
                <IconButton
                  icon={<ArrowForwardIcon />}
                  size='sm'
                  isDisabled={!canNextPage}
                  onClick={nextPage}
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
