import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Skeleton, Stack, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'

type StatItemProps = {
  description: string
  amountUserCurrency?: string
  percentChangeDecimal?: string
  helperTranslation?: string
}

type ChangeTagProps = {
  value: string
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

const helperToolTipFlexProps = {
  alignItems: 'center',
  gap: 2,
}

export const StatItem = ({
  helperTranslation,
  description,
  amountUserCurrency,
  percentChangeDecimal,
}: StatItemProps) => {
  const translate = useTranslate()

  const helperIconProps = useMemo(() => {
    return { boxSize: !helperTranslation ? 0 : undefined }
  }, [helperTranslation])

  const valueChangeTag: JSX.Element | null = useMemo(() => {
    if (!percentChangeDecimal) return null

    return <ChangeTag value={percentChangeDecimal} />
  }, [percentChangeDecimal])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Skeleton isLoaded={true}>
        <HelperTooltip
          label={translate(helperTranslation)}
          flexProps={helperToolTipFlexProps}
          iconProps={helperIconProps}
        >
          {amountUserCurrency && (
            <Amount.Fiat value={amountUserCurrency} fontSize='xl' fontWeight='medium' />
          )}
          {valueChangeTag}
        </HelperTooltip>
      </Skeleton>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={description} />
    </Stack>
  )
}
