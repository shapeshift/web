import { Container, Stack } from '@chakra-ui/react'
import { memo } from 'react'
import { FeeExplainer } from 'components/FeeExplainer/FeeExplainer'
import { Main } from 'components/Layout/Main'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

const maxWidth = { base: '100%', lg: 'container.sm' }
const padding = { base: 0, md: 8 }

export const Trade = memo(() => {
  const foxDiscountsEnabled = useFeatureFlag('FoxDiscounts')
  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full' hideBreadcrumbs>
      <Stack alignSelf='stretch' flex={1} minHeight={0} spacing={0}>
        <Container maxWidth={maxWidth} p={padding} position='relative' zIndex='2'>
          <MultiHopTrade />
        </Container>
        {foxDiscountsEnabled && <FeeExplainer />}
      </Stack>
    </Main>
  )
})
