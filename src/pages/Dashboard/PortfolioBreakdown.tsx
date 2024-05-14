import type { ResponsiveValue } from '@chakra-ui/react'
import { Card, CardBody, Flex, Skeleton, useColorModeValue } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/selectors'
import { useAppSelector } from 'state/store'

type StatCardProps = {
  percentage: number
  value: string
  label: string
  color?: string
  onClick: () => void
  isLoading?: boolean
}

const flexGap = { base: 0, xl: 6 }
const flexDirection: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }

const BreakdownCard: React.FC<StatCardProps> = ({
  percentage,
  value,
  label,
  color,
  onClick,
  isLoading,
}) => {
  const hoverBg = useColorModeValue('gray.100', 'gray.750')
  const cardHover = useMemo(() => ({ bg: hoverBg }), [hoverBg])

  return (
    <Card flex={1} cursor='pointer' onClick={onClick} _hover={cardHover}>
      <CardBody display='flex' gap={4} alignItems='center'>
        <CircularProgress
          isIndeterminate={isLoading}
          value={percentage}
          color={color ? color : 'blue.500'}
        />
        <Flex direction='column'>
          <Text color='text.subtle' fontWeight='medium' translation={label} />
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat fontWeight='bold' fontSize='xl' value={value} />
          </Skeleton>
        </Flex>
      </CardBody>
    </Card>
  )
}

export const PortfolioBreakdown = memo(() => {
  const history = useHistory()
  const earnUserCurrencyBalance = useAppSelector(selectEarnBalancesUserCurrencyAmountFull).toFixed()
  const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
  )
  const portfolioTotalUserCurrencyBalance = useAppSelector(
    selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  )
  const netWorth = useMemo(
    () =>
      bnOrZero(earnUserCurrencyBalance)
        .plus(portfolioTotalUserCurrencyBalance)
        .plus(claimableRewardsUserCurrencyBalance)
        .toFixed(),
    [
      claimableRewardsUserCurrencyBalance,
      earnUserCurrencyBalance,
      portfolioTotalUserCurrencyBalance,
    ],
  )

  const isDefiDashboardEnabled = useFeatureFlag('DefiDashboard')

  const handleWalletBalanceClick = useCallback(() => history.push('/accounts'), [history])
  const handleEarnBalanceClick = useCallback(() => history.push('/earn'), [history])

  // *don't* show these if the DefiDashboard feature flag is enabled
  if (isDefiDashboardEnabled) return null

  return (
    <Flex gap={flexGap} flexDir={flexDirection}>
      <BreakdownCard
        value={portfolioTotalUserCurrencyBalance}
        percentage={bnOrZero(portfolioTotalUserCurrencyBalance).div(netWorth).times(100).toNumber()}
        label='defi.walletBalance'
        onClick={handleWalletBalanceClick}
      />
      <BreakdownCard
        value={earnUserCurrencyBalance}
        percentage={bnOrZero(earnUserCurrencyBalance).div(netWorth).times(100).toNumber()}
        label='defi.earnBalance'
        color='green.500'
        onClick={handleEarnBalanceClick}
      />
    </Flex>
  )
})
