import { Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { RawText } from 'components/Text'

type AccountGroupProps = {
  title: string
  subtitle?: string
}

export const AccountSegment: FC<AccountGroupProps> = ({ title, subtitle }) => (
  <Stack
    direction='row'
    px={4}
    py={2}
    color='text.subtle'
    fontSize='sm'
    alignItems='center'
    justifyContent='space-between'
  >
    <RawText>{title}</RawText>
    {subtitle && (
      <RawText fontFamily='monospace' fontWeight='bold'>
        {subtitle}
      </RawText>
    )}
  </Stack>
)
