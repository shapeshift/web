import { Th, Thead, Tr } from '@chakra-ui/react'
import { Text } from 'components/Text'

type EarnTableHeaderProps = {
  onClick: (arg: string) => void
  sortConfig?: {
    key: string
    direction: string
  }
}

export const EarnTableHeader = ({ onClick }: EarnTableHeaderProps) => {
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
        <Th display={{ base: 'none', md: 'table-cell' }} onClick={() => onClick('apy')}>
          <Text translation='defi.apy' />
        </Th>
        <Th display={{ base: 'none', lg: 'table-cell' }} onClick={() => onClick('tvl')}>
          <Text translation='defi.tvl' />
        </Th>
        <Th textAlign='right' onClick={() => onClick('cryptoAmount')}>
          <Text translation='defi.balance' />
        </Th>
      </Tr>
    </Thead>
  )
}
