import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, Heading } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'
import { SEO } from 'components/Layout/Seo'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { RawText } from 'components/Text'

const alignItems = { base: 'flex-start', md: 'center' }
const padding = { base: 4, xl: 0 }
const arrowForwardIcon = <ArrowForwardIcon />

const RewardsHeader = () => {
  const translate = useTranslate()
  return (
    <>
      <SEO title={translate('navBar.rewards')} />
      <Flex alignItems={alignItems} px={padding} flexWrap='wrap'>
        <Flex width='full' justifyContent='space-between' alignItems='center'>
          <Heading fontSize='xl'>{translate('defi.myRewards')}</Heading>
          <Button
            colorScheme='purple'
            variant='ghost'
            as={NavLink}
            to='/earn'
            size='sm'
            rightIcon={arrowForwardIcon}
          >
            {translate('defi.viewAllPositions')}
          </Button>
        </Flex>
        <RawText color='text.subtle'>{translate('defi.myRewardsBody')}</RawText>
      </Flex>
    </>
  )
}

const rewardsHeader = <RewardsHeader />

export const RewardsDashboard = memo(() => {
  return <DeFiEarn includeRewardsBalances header={rewardsHeader} />
})
