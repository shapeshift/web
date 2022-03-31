import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Table, Tbody, Td, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Column, Row, TableState, useSortBy, useTable } from 'react-table'

type ReactTableProps = {
  columns: Column<any>[]
  data: object[]
  displayHeaders?: boolean
  onRowClick?: (row: Row<object>) => void
  initialState?: Partial<TableState<object>>
}

export const ReactTable = ({
  columns,
  data,
  displayHeaders = true,
  onRowClick,
  initialState
}: ReactTableProps) => {
  const hoverColor = useColorModeValue('black', 'white')
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data,
      initialState
    },
    useSortBy
  )
  const renderRows = useMemo(() => {
    return rows.map(row => {
      prepareRow(row)
      return (
        <Tr
          {...row.getRowProps()}
          tabIndex={row.index}
          onClick={() => onRowClick && onRowClick(row)}
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
    <Table variant='clickable' {...getTableProps()}>
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
                  {displayHeaders && column.render('Header')}
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
      <Tbody {...getTableBodyProps()}>{renderRows}</Tbody>
    </Table>
  )
}
