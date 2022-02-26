import { Th, Thead, Tr } from '@chakra-ui/react'
import { Text } from 'components/Text'
export const EarnTableHeader = () => {
  return (
    <Thead color='gray.500'>
      <Tr>
        <Th display={{ base: 'none', md: 'table-cell' }} width='60px'>
          #
        </Th>
        <Th>
          <Text translation='defi.asset' />
        </Th>
        <Th display={{ base: 'none', lg: 'table-cell' }}>
          <Text translation='defi.category' />
        </Th>
        <Th display={{ base: 'none', md: 'table-cell' }}>
          <Text translation='defi.apy' />
        </Th>
        <Th display={{ base: 'none', lg: 'table-cell' }}>
          <Text translation='defi.tvl' />
        </Th>
        <Th textAlign='right'>
          <Text translation='defi.balance' />
        </Th>
      </Tr>
    </Thead>
  )
}
