import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type PositionItemProps = {
  translation: string
  amountFiat?: string
  valueChange?: number
}

type ChangeTagProps = {
  value?: number
}

// @TODO: This is used in both pool and here, make it reusable
const ChangeTag: React.FC<ChangeTagProps> = ({ value }) => {
  const icon = (value ?? 0) >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />
  const color = (value ?? 0) >= 0 ? 'green.500' : 'red.500'
  const colorScheme = (value ?? 0) >= 0 ? 'green' : 'red'
  return (
    <Skeleton isLoaded={value !== undefined}>
      <Tag display='flex' colorScheme={colorScheme} size='sm' alignItems='center'>
        {icon}
        <Amount.Percent value={value ?? '0'} fontWeight='medium' color={color} />
      </Tag>
    </Skeleton>
  )
}

export const TotalItem = ({ translation, amountFiat, valueChange }: PositionItemProps) => {
  const valueChangeTag: JSX.Element | null = useMemo(() => {
    if (!valueChange) return null

    return <ChangeTag value={valueChange} />
  }, [valueChange])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Skeleton isLoaded={true}>
        <Flex alignItems='center' gap={2}>
          {amountFiat && <Amount.Fiat value={amountFiat} fontSize='xl' fontWeight='medium' />}
          {valueChangeTag}
        </Flex>
      </Skeleton>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={translation} />
    </Stack>
  )
}
