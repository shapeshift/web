import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Table, Tbody, Td, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Column, useSortBy, useTable } from 'react-table'

type ReactTableProps = {
  columns: Column<any>[]
  data: any[]
}

export const ReactTable = ({ columns, data }: ReactTableProps) => {
  const hoverColor = useColorModeValue('black', 'white')
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data
    },
    useSortBy
  )
  const renderRows = useMemo(() => {
    return rows.map(row => {
      prepareRow(row)
      return (
        <Tr {...row.getRowProps()} tabIndex={row.index}>
          {row.cells.map(cell => (
            <Td {...cell.getCellProps()} display={cell.column.display}>
              {cell.render('Cell')}
            </Td>
          ))}
        </Tr>
      )
    })
  }, [prepareRow, rows])

  return (
    <Table variant='clickable' {...getTableProps()}>
      <Thead>
        {headerGroups.map(headerGroup => (
          <Tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <Th
                {...column.getHeaderProps(column.getSortByToggleProps())}
                color='gray.500'
                display={column.display}
                _hover={{ color: column.canSort ? hoverColor : 'gray.500' }}
              >
                <Flex>
                  {column.render('Header')}
                  <Flex ml={2}>
                    {column.isSorted ? (
                      column.isSortedDesc ? (
                        <ArrowDownIcon aria-label='sorted descending' />
                      ) : (
                        <ArrowUpIcon aria-label='sorted ascending' />
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
