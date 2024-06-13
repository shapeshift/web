import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Skeleton } from '@chakra-ui/react'
import type { TagProps } from '@chakra-ui/tag'
import { Tag } from '@chakra-ui/tag'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { Amount } from 'components/Amount/Amount'

export type ChangeTagProps = {
  value: string | number | undefined
  hasBackground?: boolean
} & TagProps

export const ChangeTag: React.FC<ChangeTagProps> = ({ value, hasBackground = false, ...props }) => {
  const icon = bnOrZero(value).isGreaterThanOrEqualTo(0) ? <ArrowUpIcon /> : <ArrowDownIcon />
  const colorScheme = bnOrZero(value).isGreaterThanOrEqualTo(0) ? 'green' : 'red'

  return (
    <Skeleton isLoaded={value !== undefined}>
      <Tag
        display='flex'
        colorScheme={colorScheme}
        backgroundColor={!hasBackground ? 'none' : undefined}
        background={!hasBackground ? 'none' : undefined}
        size='sm'
        alignItems='center'
        {...props}
      >
        {icon}
        <Amount.Percent value={value ?? ''} fontWeight='medium' />
      </Tag>
    </Skeleton>
  )
}
