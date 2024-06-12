import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type StatItemProps = {
  description: string
  amountUserCurrency?: string
  percentChangeDecimal?: string
}

type ChangeTagProps = {
  value?: string
}

// @TODO: This is used in both pool and here, make it reusable
const ChangeTag: React.FC<ChangeTagProps> = ({ value }) => {
  const icon = bnOrZero(value).isGreaterThanOrEqualTo(0) ? <ArrowUpIcon /> : <ArrowDownIcon />
  const color = bnOrZero(value).isGreaterThanOrEqualTo(0) ? 'green.500' : 'red.500'
  const colorScheme = bnOrZero(value).isGreaterThanOrEqualTo(0) ? 'green' : 'red'
  return (
    <Skeleton isLoaded={value !== undefined}>
      <Tag display='flex' colorScheme={colorScheme} size='sm' alignItems='center'>
        {icon}
        <Amount.Percent value={value ?? '0'} fontWeight='medium' color={color} />
      </Tag>
    </Skeleton>
  )
}

export const StatItem = ({
  description,
  amountUserCurrency,
  percentChangeDecimal,
}: StatItemProps) => {
  const valueChangeTag: JSX.Element | null = useMemo(() => {
    if (!percentChangeDecimal) return null

    return <ChangeTag value={percentChangeDecimal} />
  }, [percentChangeDecimal])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Skeleton isLoaded={true}>
        <Flex alignItems='center' gap={2}>
          {amountUserCurrency && (
            <Amount.Fiat value={amountUserCurrency} fontSize='xl' fontWeight='medium' />
          )}
          {valueChangeTag}
        </Flex>
      </Skeleton>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={description} />
    </Stack>
  )
}
