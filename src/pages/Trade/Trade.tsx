import { Flex } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { MultiHopTrade } from 'components/MultiHopTrade/MultiHopTrade'

const padding = { base: 0, md: 8 }

export const Trade = memo(() => {
  const translate = useTranslate()
  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full' hideBreadcrumbs>
      <SEO title={translate('navBar.trade')} />
      <Flex
        pt={12}
        px={padding}
        alignItems='flex-start'
        width='full'
        justifyContent='center'
        gap={4}
      >
        <MultiHopTrade />
      </Flex>
    </Main>
  )
})
