import { Heading, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'

export const ReferralHeader = () => {
  const translate = useTranslate()
  return (
    <Stack spacing={2}>
      <Heading>{translate('navBar.referral')}</Heading>
      <RawText color='text.subtle'>{translate('referral.description')}</RawText>
    </Stack>
  )
}
