import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
    Flex,
    Skeleton,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useColorModeValue,
} from '@chakra-ui/react'
import type { Row, Table as TanstackTable } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'

import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

type YieldColumnMeta = {
    display?: Record<string, string>
    textAlign?: 'left' | 'right' | 'center'
    justifyContent?: string
}

const tableSize = { base: 'sm', md: 'md' }

export const YieldTable = ({
    table,
    isLoading,
    onRowClick,
}: {
    table: TanstackTable<AugmentedYieldDto>
    isLoading: boolean
    onRowClick: (row: Row<AugmentedYieldDto>) => void
}) => {
    const hoverBg = useColorModeValue('gray.50', 'gray.750')
    const hoverColor = useColorModeValue('black', 'white')
    const columns = table.getAllColumns()

    return (
        <Table variant='simple' size={tableSize}>
            <Thead>
                {table.getHeaderGroups().map(headerGroup => (
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
                                    _hover={canSort ? { color: hoverColor } : undefined}
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
            <Tbody>
                {isLoading
                    ? Array.from({ length: 6 }).map((_, rowIndex) => (
                        <Tr key={rowIndex}>
                            {columns.map(column => (
                                <Td key={`${rowIndex}-${column.id}`}>
                                    <Skeleton height='16px' />
                                </Td>
                            ))}
                        </Tr>
                    ))
                    : table.getRowModel().rows.map(row => {
                        const isClickable = row.original.status.enter
                        return (
                            <Tr
                                key={row.id}
                                cursor={isClickable ? 'pointer' : undefined}
                                onClick={() => {
                                    if (!isClickable) return
                                    onRowClick(row)
                                }}
                                _hover={isClickable ? { bg: hoverBg } : undefined}
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
                    })}
            </Tbody>
        </Table>
    )
}
