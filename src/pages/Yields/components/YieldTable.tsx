import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Skeleton, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'
import type { Row, Table as TanstackTable } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { memo, useCallback, useMemo } from 'react'

import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldColumnMeta = {
  display?: Record<string, string>
  textAlign?: 'left' | 'right' | 'center'
  justifyContent?: string
}

type YieldTableProps = {
  table: TanstackTable<AugmentedYieldDto>
  isLoading: boolean
  onRowClick: (row: Row<AugmentedYieldDto>) => void
}

const tableSize = { base: 'sm', md: 'md' }
const SKELETON_ROWS = 6

export const YieldTable = memo(({ table, isLoading, onRowClick }: YieldTableProps) => {
  const columns = useMemo(() => table.getAllColumns(), [table])
  const headerGroups = useMemo(() => table.getHeaderGroups(), [table])
  const rows = useMemo(() => table.getRowModel().rows, [table])

  const handleRowClick = useCallback(
    (row: Row<AugmentedYieldDto>) => {
      if (!row.original.status.enter) return
      onRowClick(row)
    },
    [onRowClick],
  )

  const loadingRows = useMemo(
    () =>
      Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
        <Tr key={rowIndex}>
          {columns.map(column => (
            <Td key={`${rowIndex}-${column.id}`}>
              <Skeleton height='16px' />
            </Td>
          ))}
        </Tr>
      )),
    [columns],
  )

  const dataRows = useMemo(
    () =>
      rows.map(row => {
        const isClickable = row.original.status.enter
        return (
          <Tr
            key={row.id}
            cursor={isClickable ? 'pointer' : undefined}
            onClick={() => handleRowClick(row)}
            _hover={isClickable ? { bg: 'background.surface.raised.base' } : undefined}
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
      }),
    [rows, handleRowClick],
  )

  const tbodyContent = useMemo(
    () => (isLoading ? loadingRows : dataRows),
    [isLoading, loadingRows, dataRows],
  )

  return (
    <Table variant='simple' size={tableSize}>
      <Thead>
        {headerGroups.map(headerGroup => (
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
                  _hover={canSort ? { color: 'text.base' } : undefined}
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
      <Tbody>{tbodyContent}</Tbody>
    </Table>
  )
})
