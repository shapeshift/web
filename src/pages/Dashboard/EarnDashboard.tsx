import { Flex } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'

import { SEO } from '@/components/Layout/Seo'
import { DeFiEarn } from '@/components/StakingVaults/DeFiEarn'

const alignItems = { base: 'flex-start', md: 'center' }
const padding = { base: 4, xl: 0 }

const EarnHeader = () => {
  const translate = useTranslate()

  return (
    <Flex alignItems={alignItems} px={padding} flexWrap='wrap'>
      <SEO title={translate('navBar.defi')} />
    </Flex>
  )
}

export const EarnDashboard = memo(() => {
  return (
    <>
      <EarnHeader />
      <DeFiEarn includeEarnBalances />
    </>
  )
})
