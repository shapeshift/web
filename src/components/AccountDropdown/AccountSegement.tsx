import { Stack } from '@chakra-ui/react'
import type { FC } from 'react'

import { RawText } from '@/components/Text'

type AccountGroupProps = {
  title: string
  subtitle?: string
}

export const AccountSegment: FC<AccountGroupProps> = ({ title, subtitle }) => (
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
        {subtitle}
      </RawText>
    )}
  </Stack>
)
