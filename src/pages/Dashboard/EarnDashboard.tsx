import { Flex, Heading } from '@chakra-ui/react'
import { memo, useDeferredValue, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SEO } from '@/components/Layout/Seo'
import { DeFiEarn } from '@/components/StakingVaults/DeFiEarn'
import { DeFiEarnSkeleton } from '@/components/StakingVaults/DeFiEarnSkeleton'
import { RawText } from '@/components/Text'

const alignItems = { base: 'flex-start', md: 'center' }

const EarnHeader = () => {
  const translate = useTranslate()

  return (
    <Flex alignItems={alignItems} flexWrap='wrap'>
      <SEO title={translate('navBar.defi')} />
      <Heading fontSize='xl' display='block' width='full'>
        {translate('defi.myPositions')}
      </Heading>
      <RawText color='text.subtle'>{translate('defi.myPositionsBody')}</RawText>
    </Flex>
  )
}

const earnHeader = <EarnHeader />

const EarnContent = () => {
  return <DeFiEarn includeEarnBalances header={earnHeader} />
}

export const EarnDashboard = memo(() => {
  const [shouldRender, setShouldRender] = useState(false)
  const deferredShouldRender = useDeferredValue(shouldRender)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShouldRender(true)
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [])

  if (!deferredShouldRender) {
    return <DeFiEarnSkeleton />
  }

  return <EarnContent />
})
