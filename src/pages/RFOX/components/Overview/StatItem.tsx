import { Skeleton, Stack } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { ChangeTag } from '@/components/ChangeTag/ChangeTag'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText, Text } from '@/components/Text'

type StatItemProps = {
  description: string
  amountUserCurrency?: string
  percentChangeDecimal?: string
  helperDescription?: string
  isLoading: boolean
  isError?: boolean
}

const helperToolTipFlexProps = {
  alignItems: 'center',
  gap: 2,
}

export const StatItem = ({
  helperDescription,
  description,
  amountUserCurrency,
  percentChangeDecimal,
  isLoading,
  isError,
}: StatItemProps) => {
  const translate = useTranslate()

  const helperIconProps = useMemo(() => {
    return { boxSize: !helperDescription ? 0 : undefined }
  }, [helperDescription])

  const valueChangeTag: JSX.Element | null = useMemo(() => {
    if (!percentChangeDecimal) return null

    return <ChangeTag hasBackground={true} percentChangeDecimal={percentChangeDecimal} />
  }, [percentChangeDecimal])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Skeleton isLoaded={!isLoading || Boolean(isError)}>
        <HelperTooltip
          label={translate(helperDescription ?? '')}
          flexProps={helperToolTipFlexProps}
          iconProps={helperIconProps}
        >
          {isError || amountUserCurrency === undefined ? (
            <RawText fontSize='xl' fontWeight='medium'>
              --
            </RawText>
          ) : (
            <Amount.Fiat value={amountUserCurrency} fontSize='xl' fontWeight='medium' />
          )}
          {valueChangeTag}
        </HelperTooltip>
      </Skeleton>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={description} />
    </Stack>
  )
}
