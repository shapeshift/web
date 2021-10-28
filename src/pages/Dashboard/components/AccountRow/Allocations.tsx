import { Progress } from '@chakra-ui/react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'

export const Allocations = ({ fiatValue }: { fiatValue: string }) => {
  const { totalBalance } = usePortfolio()
  return (
    <Progress
      variant='right-aligned'
      colorScheme='green'
      size='sm'
      value={bnOrZero(fiatValue).div(bnOrZero(totalBalance)).times(100).toNumber()}
      rounded='full'
      width='100px'
    />
  )
}
