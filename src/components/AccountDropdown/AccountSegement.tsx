import { Stack, useBreakpointValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useMemo } from 'react'

import { RawText } from '@/components/Text'
import { trimWithEndEllipsis } from '@/lib/utils'

type AccountGroupProps = {
  title: string
  subtitle?: string
}

export const AccountSegment: FC<AccountGroupProps> = ({ title, subtitle }) => {
  const maxLength = useBreakpointValue({ base: 25, md: 50 })
  const truncatedSubtitle = useMemo(
    () => trimWithEndEllipsis(subtitle, maxLength),
    [subtitle, maxLength],
  )

  return (
    <Stack
      direction='row'
      color='text.subtle'
      fontSize='sm'
      alignItems='center'
      justifyContent='space-between'
      width='full'
    >
      <RawText>{title}</RawText>
      {subtitle && (
        <RawText fontFamily='monospace' fontWeight='bold'>
          {truncatedSubtitle}
        </RawText>
      )}
    </Stack>
  )
}
