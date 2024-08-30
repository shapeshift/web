import { Stack } from '@chakra-ui/react'
import { type FC } from 'react'
import { InlineCopyButton } from 'components/InlineCopyButton'
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
      // @TODO: Get full account address
      <InlineCopyButton value={subtitle}>
        <RawText fontFamily='monospace' fontWeight='bold'>
          {subtitle}
        </RawText>
      </InlineCopyButton>
    )}
  </Stack>
)
