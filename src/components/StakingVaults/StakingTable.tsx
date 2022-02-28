import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'
import { Column, useSortBy, useTable } from 'react-table'

type StakingTableProps = {
  columns: Column[]
  data: any[]
  onClick: (arg: any) => void
}

export const StakingTable = ({ columns, data, onClick }: StakingTableProps) => {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
    {
      columns,
      data
    },
    useSortBy
  )
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
                _hover={{ color: 'white' }}
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
      <Tbody {...getTableBodyProps()}>
        {rows.map(row => {
          prepareRow(row)
          return (
            <Tr {...row.getRowProps()} onClick={() => onClick(row.original)}>
              {row.cells.map(cell => (
                <Td {...cell.getCellProps()} display={cell.column.display}>
                  {cell.render('Cell')}
                </Td>
              ))}
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
