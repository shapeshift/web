import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'
import { DeFiEarn } from 'components/StakingVaults/DeFiEarn'
import { RawText } from 'components/Text'

const RewardsHeader = () => {
  const translate = useTranslate()
  return (
    <Flex alignItems={{ base: 'flex-start', md: 'center' }} px={{ base: 4, xl: 0 }} flexWrap='wrap'>
      <Flex width='full' justifyContent='space-between' alignItems='center'>
        <Heading fontSize='xl'>{translate('defi.myRewards')}</Heading>
        <Button
          colorScheme='purple'
          variant='ghost'
          as={NavLink}
          to='/earn'
          size='sm'
          rightIcon={<ArrowForwardIcon />}
        >
          {translate('defi.viewAllPositions')}
        </Button>
      </Flex>
      <RawText color='gray.500'>{translate('defi.myRewardsBody')}</RawText>
    </Flex>
  )
}

export const RewardsDashboard = () => {
  return <DeFiEarn includeRewardsBalances header={<RewardsHeader />} />
}
