import {
  Container,
  Flex,
  Stack,
  StackDivider,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  useColorModeValue,
} from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AccountsIcon } from 'components/Icons/Accounts'
import { BoltIcon } from 'components/Icons/Bolt'
import { DefiIcon } from 'components/Icons/DeFi'
import { RewardsIcon } from 'components/Icons/RewardsIcon'
import { Text } from 'components/Text'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
  const location = useLocation()
  const claimableRewardsFiatBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsFiatBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsFiatBalanceFilter),
  )
  const earnFiatBalance = useAppSelector(selectEarnBalancesFiatAmountFull).toFixed()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const netWorth = useMemo(
    () =>
      bnOrZero(earnFiatBalance)
        .plus(portfolioTotalFiatBalance)
        .plus(claimableRewardsFiatBalance)
        .toFixed(),
    [claimableRewardsFiatBalance, earnFiatBalance, portfolioTotalFiatBalance],
  )
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Stack spacing={0} borderColor={borderColor}>
      <Container
        width='full'
        display='flex'
        maxWidth='container.xl'
        px={8}
        py={4}
        alignItems='center'
        gap={{ base: 2, md: 6 }}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <Text translation='navBar.dashboard' fontSize='xl' fontWeight='medium' />
        <Flex alignItems='center' gap={4}>
          <Flex alignItems='center' gap={2}>
            <BoltIcon color='yellow.500' />
            <Text translation='defi.netWorth' color='gray.500' />
          </Flex>
          <Amount.Fiat value={netWorth} fontSize='xl' fontWeight='bold' />
        </Flex>
      </Container>
      <Flex
        flexDir={{ base: 'column', md: 'row' }}
        borderBottomWidth={1}
        borderColor={borderColor}
        marginBottom='-1px'
        gap={8}
        position='sticky'
        top='72px'
      >
        <Container maxWidth='container.xl' display='flex' gap={8} px={8}>
          <DashboardTab
            label='common.overview'
            icon={<AccountsIcon />}
            fiatValue={portfolioTotalFiatBalance}
            path='/dashboard'
            color='blue.500'
          />
          <DashboardTab
            label='navBar.wallet'
            icon={<AccountsIcon />}
            fiatValue=''
            path='/wallet'
            color='blue.500'
          />
          <DashboardTab
            label='navBar.earn'
            icon={<DefiIcon />}
            fiatValue={earnFiatBalance}
            path='/dashboard/earn'
            color='purple.500'
          />
          <DashboardTab
            label='defi.rewardsBalance'
            icon={<RewardsIcon />}
            fiatValue={claimableRewardsFiatBalance}
            path='/dashboard/rewards'
            color='green.500'
          />
          <DashboardTab
            label='common.activity'
            icon={<RewardsIcon />}
            fiatValue=''
            path='/transaction-history'
            color='green.500'
          />
        </Container>
      </Flex>
    </Stack>
  )
}
