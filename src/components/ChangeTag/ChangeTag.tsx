import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Skeleton } from '@chakra-ui/react'
import type { TagProps } from '@chakra-ui/tag'
import { Tag } from '@chakra-ui/tag'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { Amount } from 'components/Amount/Amount'

export type ChangeTagProps = {
  percentChangeDecimal: string | number | undefined
  hasBackground?: boolean
} & TagProps

export const ChangeTag: React.FC<ChangeTagProps> = ({
  percentChangeDecimal,
  hasBackground = false,
  ...tagProps
}) => {
  const icon = bnOrZero(percentChangeDecimal).isGreaterThanOrEqualTo(0) ? (
    <ArrowUpIcon />
  ) : (
    <ArrowDownIcon />
  )
  const colorScheme = bnOrZero(percentChangeDecimal).isGreaterThanOrEqualTo(0) ? 'green' : 'red'

  return (
    <Skeleton isLoaded={percentChangeDecimal !== undefined}>
      <Tag
        display='flex'
        colorScheme={colorScheme}
        backgroundColor={!hasBackground ? 'none' : undefined}
        background={!hasBackground ? 'none' : undefined}
        size='sm'
        alignItems='center'
        {...tagProps}
      >
        {icon}
        <Amount.Percent value={percentChangeDecimal ?? ''} fontWeight='medium' />
      </Tag>
    </Skeleton>
  )
}
