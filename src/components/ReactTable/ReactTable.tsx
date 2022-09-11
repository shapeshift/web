import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Table, Tbody, Td, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { Column, Row, TableState } from 'react-table'
import { useSortBy, useTable } from 'react-table'

type ReactTableProps<T extends {}> = {
  columns: Column<T>[]
  data: T[]
  displayHeaders?: boolean
  onRowClick?: (row: Row<T>) => void
  initialState?: Partial<TableState<{}>>
}

export const ReactTable = <T extends {}>({
  columns,
  data,
  displayHeaders = true,
  onRowClick,
  initialState,
}: ReactTableProps<T>) => {
  const hoverColor = useColorModeValue('black', 'white')
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable<T>(
    {
      columns,
      data,
      initialState,
    },
    useSortBy,
  )
  const renderRows = useMemo(() => {
    return rows.map(row => {
      prepareRow(row)
      return (
        <Tr
          {...row.getRowProps()}
          tabIndex={row.index}
          onClick={() => onRowClick?.(row)}
          cursor={onRowClick ? 'pointer' : undefined}
        >
          {row.cells.map(cell => (
            <Td {...cell.getCellProps()} display={cell.column.display}>
              {cell.render('Cell')}
            </Td>
          ))}
        </Tr>
      )
    })
  }, [prepareRow, rows, onRowClick])

  return (
    <Table variant='clickable' size={{ base: 'sm', md: 'md' }} {...getTableProps()}>
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
                    <Flex>
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
    </Table>
  )
}
