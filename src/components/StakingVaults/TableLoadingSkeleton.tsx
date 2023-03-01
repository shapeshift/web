import { Skeleton, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'
import { useMemo } from 'react'

type TableSkeletonLoaderProps = {
  rows?: number
  columns?: number
}
export const TableSkeletonLoader: React.FC<TableSkeletonLoaderProps> = ({
  rows = 10,
  columns = 5,
}) => {
  const renderHeader = useMemo(() => {
    return Array(columns)
      .fill(0)
      .map(i => (
        <Th key={i}>
          <Skeleton height='16px' />
        </Th>
      ))
  }, [columns])

  const renderBody = useMemo(() => {
    return Array(rows)
      .fill(0)
      .map(index => (
        <Tr key={`row-${index}`}>
          {Array(columns)
            .fill(0)
            .map(i => (
              <Td key={i}>
                <Skeleton height='20px' />
              </Td>
            ))}
        </Tr>
      ))
  }, [columns, rows])
  return (
    <Table variant='default'>
      <Thead>{renderHeader}</Thead>
      <Tbody>{renderBody}</Tbody>
    </Table>
  )
}
