import { Button, Skeleton, Stack } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { ChangeTag } from '@/components/ChangeTag/ChangeTag'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'

type StatItemProps = {
  description: string
  amountUserCurrency?: string
  percentChangeDecimal?: string
  helperDescription?: string
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
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
  onRetry,
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
            <Text translation='RFOX.dataUnavailable' color='text.subtle' />
          ) : (
            <Amount.Fiat value={amountUserCurrency} fontSize='xl' fontWeight='medium' />
          )}
          {(isError || amountUserCurrency === undefined) && onRetry && (
            <Button size='xs' variant='link' onClick={onRetry} ml={2} isDisabled={isLoading}>
              {translate('common.retry')}
            </Button>
          )}
          {valueChangeTag}
        </HelperTooltip>
      </Skeleton>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={description} />
    </Stack>
  )
}
