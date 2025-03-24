import { Flex, Heading } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SEO } from '@/components/Layout/Seo'
import { DeFiEarn } from '@/components/StakingVaults/DeFiEarn'
import { RawText } from '@/components/Text'

const alignItems = { base: 'flex-start', md: 'center' }
const padding = { base: 4, xl: 0 }

const EarnHeader = () => {
  const translate = useTranslate()

  return (
    <Flex alignItems={alignItems} px={padding} flexWrap='wrap'>
      <SEO title={translate('navBar.defi')} />
      <Heading fontSize='xl' display='block' width='full'>
        {translate('defi.myPositions')}
      </Heading>
      <RawText color='text.subtle'>{translate('defi.myPositionsBody')}</RawText>
    </Flex>
  )
}

const earnHeader = <EarnHeader />

export const EarnDashboard = memo(() => {
  return (
    <>
      <DeFiEarn includeEarnBalances header={earnHeader} />
    </>
  )
})
