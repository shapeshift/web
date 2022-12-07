import { Stack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text/Text'

type AllocationItem = {
  symbol: string
  value: string
  icon: string
}

type AllocationTableProps = {
  label: string
  rightElement?: ReactNode
  items: AllocationItem[]
}

export const AllocationTable: React.FC<AllocationTableProps> = ({ label, rightElement, items }) => {
  return (
    <Stack>
      <Stack direction='row' fontSize='sm' color='gray.500' justifyContent='space-between'>
        <RawText>{label}</RawText>
        {rightElement}
      </Stack>
      {items.map(item => (
        <Stack direction='row' key={item.symbol}>
          <AssetIcon size='xs' src={item.icon} />
          <Amount.Crypto value={item.value} symbol={item.symbol} />
        </Stack>
      ))}
    </Stack>
  )
}
