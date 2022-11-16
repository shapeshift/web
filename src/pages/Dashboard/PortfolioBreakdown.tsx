import { Flex, Skeleton, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bn } from 'lib/bignumber/bignumber'
import { useEarnBalances } from 'pages/Defi/hooks/useEarnBalances'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectPortfolioTotalFiatBalanceWithStakingData,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StatCardProps = {
  percentage: number
  value: string
  label: string
  color?: string
  onClick: () => void
  isLoading?: boolean
}

const BreakdownCard: React.FC<StatCardProps> = ({
  percentage,
  value,
  label,
  color,
  onClick,
  isLoading,
}) => {
  const hoverBg = useColorModeValue('gray.100', 'gray.750')
  return (
    <Card flex={1} cursor='pointer' onClick={onClick} _hover={{ bg: hoverBg }}>
      <Card.Body display='flex' gap={4} alignItems='center'>
        <CircularProgress
          isIndeterminate={isLoading}
          value={percentage}
          color={color ? color : 'blue.500'}
        />
        <Flex direction='column'>
          <Text color='gray.500' fontWeight='medium' translation={label} />
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat fontWeight='bold' fontSize='xl' value={value} />
          </Skeleton>
        </Flex>
      </Card.Body>
    </Card>
  )
}

export const PortfolioBreakdown = () => {
  const isDashboardBreakdownEnabled = useFeatureFlag('DashboardBreakdown')
  const history = useHistory()
  //FOXY, OSMO, COSMO, Yarn Vaults
  const balances = useEarnBalances()
  //FOX/ETH LP Balance

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId as LpId,
      assetId: foxEthLpAssetId,
    }),
    [],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const lpUnderlyingToken1Balance = foxEthLpOpportunity?.underlyingToken1Amount ?? 0
  // Portfolio including Staking
  const netWorth = useAppSelector(selectPortfolioTotalFiatBalanceWithStakingData)
  const totalEarnBalance = bn(balances.totalEarningBalance).plus(lpUnderlyingToken1Balance)
  const walletBalanceWithoutEarn = bn(netWorth).minus(balances.totalEarningBalance)
  if (!isDashboardBreakdownEnabled) return null
  return (
    <Flex gap={{ base: 0, xl: 6 }} flexDir={{ base: 'column', md: 'row' }}>
      <BreakdownCard
        value={walletBalanceWithoutEarn.toString()}
        percentage={walletBalanceWithoutEarn.div(netWorth).times(100).toNumber()}
        label='defi.walletBalance'
        onClick={() => history.push('/accounts')}
        isLoading={balances.loading}
      />
      <BreakdownCard
        value={totalEarnBalance.toString()}
        percentage={totalEarnBalance.div(netWorth).times(100).toNumber()}
        label='defi.earnBalance'
        color='green.500'
        onClick={() => history.push('/defi')}
        isLoading={balances.loading}
      />
    </Flex>
  )
}
