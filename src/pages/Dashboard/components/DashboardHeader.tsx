import { Flex, Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
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
  const claimableRewardsBalance = useAppSelector(state => selectClaimableRewards(state, {}))
  const earnBalance = useAppSelector(selectEarnBalancesFiatAmountFull).toFixed()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const netWorth = useMemo(
    () => bnOrZero(earnBalance).plus(portfolioTotalFiatBalance).toFixed(),
    [earnBalance, portfolioTotalFiatBalance],
  )
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Stack spacing={0} divider={<StackDivider />} borderColor={borderColor}>
      <Flex
        width='full'
        bg='blackAlpha.100'
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
      </Flex>
      <Flex
        flexDir={{ base: 'column', md: 'row' }}
        bg='blackAlpha.100'
        borderBottomWidth={1}
        borderColor={borderColor}
        marginBottom='-1px'
      >
        <DashboardTab
          label='defi.walletBalance'
          icon={<AccountsIcon />}
          fiatValue={portfolioTotalFiatBalance}
          path='/dashboard'
          color='blue.500'
        />
        <DashboardTab
          label='defi.earnBalance'
          icon={<DefiIcon />}
          fiatValue={earnBalance}
          path='/dashboard/earn'
          color='purple.500'
        />
        <DashboardTab
          label='defi.rewardBalance'
          icon={<RewardsIcon />}
          fiatValue={claimableRewardsBalance}
          path='/dashboard/rewards'
          color='green.500'
        />
      </Flex>
    </Stack>
  )
}
