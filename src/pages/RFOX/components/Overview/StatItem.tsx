import { Skeleton, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { ChangeTag } from 'components/ChangeTag/ChangeTag'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'

type StatItemProps = {
  description: string
  amountUserCurrency?: string
  percentChangeDecimal?: string
  helperTranslation?: string
  isLoading: boolean
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
  isLoading,
}: StatItemProps) => {
  const translate = useTranslate()

  const helperIconProps = useMemo(() => {
    return { boxSize: !helperTranslation ? 0 : undefined }
  }, [helperTranslation])

  const valueChangeTag: JSX.Element | null = useMemo(() => {
    if (!percentChangeDecimal) return null

    return <ChangeTag hasBackground={true} percentChangeDecimal={percentChangeDecimal} />
  }, [percentChangeDecimal])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Skeleton isLoaded={!isLoading}>
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
