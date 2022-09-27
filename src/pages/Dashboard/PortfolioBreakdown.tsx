import { Flex, Skeleton, useColorModeValue } from '@chakra-ui/react'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { bn } from 'lib/bignumber/bignumber'
import { useEarnBalances } from 'pages/Defi/hooks/useEarnBalances'
import { selectPortfolioTotalFiatBalanceWithStakingData } from 'state/slices/selectors'

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
  const balances = useEarnBalances()
  const { totalBalance: lpBalance } = useFoxEth()
  const netWorth = useSelector(selectPortfolioTotalFiatBalanceWithStakingData)
  const actualNetworth = bn(netWorth).plus(bn(lpBalance))
  const totalEarnBalance = bn(balances.totalEarningBalance).plus(bn(lpBalance))
  const walletBalanceWithoutEarn = bn(actualNetworth).minus(bn(balances.totalEarningBalance))
  return (
    <Flex gap={{ base: 0, xl: 6 }} flexDir={{ base: 'column', md: 'row' }}>
      <BreakdownCard
        value={walletBalanceWithoutEarn.toString()}
        percentage={walletBalanceWithoutEarn.div(actualNetworth).times(100).toNumber()}
        label='defi.walletBalance'
        onClick={() => history.push('/accounts')}
        isLoading={balances.loading}
      />
      <BreakdownCard
        value={totalEarnBalance.toString()}
        percentage={totalEarnBalance.div(actualNetworth).times(100).toNumber()}
        label='defi.earnBalance'
        color='green.500'
        onClick={() => history.push('/defi')}
        isLoading={balances.loading}
      />
    </Flex>
  )
}
