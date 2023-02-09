import { Flex, Skeleton, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useEarnBalances } from 'pages/Defi/hooks/useEarnBalances'
import { selectPortfolioTotalFiatBalanceExcludeEarnDupes } from 'state/slices/selectors'
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
  const history = useHistory()
  //FOXY, OSMO, COSMO, Yarn Vaults
  // TODO(gomes): This goes away in a follow-up PR
  // - FOXy balances are now the only effective reason we have a useEarnBalances( hook, and a selector should be able to get that
  // - Once useEarnBalances() is removed, we should be able to properly get earn balances from selector, meaning the total balance will accurately be
  // the same as the addition below
  const earnBalances = useEarnBalances()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const netWorth = useMemo(
    () => bnOrZero(earnBalances.totalEarningBalance).plus(portfolioTotalFiatBalance).toFixed(),
    [earnBalances.totalEarningBalance, portfolioTotalFiatBalance],
  )
  return (
    <Flex gap={{ base: 0, xl: 6 }} flexDir={{ base: 'column', md: 'row' }}>
      <BreakdownCard
        value={portfolioTotalFiatBalance}
        percentage={bnOrZero(portfolioTotalFiatBalance).div(netWorth).times(100).toNumber()}
        label='defi.walletBalance'
        onClick={() => history.push('/accounts')}
        isLoading={earnBalances.loading}
      />
      <BreakdownCard
        value={earnBalances.totalEarningBalance}
        percentage={bnOrZero(earnBalances.totalEarningBalance).div(netWorth).times(100).toNumber()}
        label='defi.earnBalance'
        color='green.500'
        onClick={() => history.push('/defi')}
        isLoading={earnBalances.loading}
      />
    </Flex>
  )
}
