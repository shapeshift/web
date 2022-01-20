import { SimpleGrid, Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'

import { UseEarnBalancesReturn } from '../hooks/useEarnBalances'

type EarnStatProps = {
  label: string
  value: string
}

function EarnStat({ label, value }: EarnStatProps) {
  return (
    <Card flex={1} boxShadow='none'>
      <Card.Body>
        <Stat>
          <StatLabel>
            <Text translation={label} />
          </StatLabel>
          <StatNumber>
            <Amount.Fiat value={value} />
          </StatNumber>
        </Stat>
      </Card.Body>
    </Card>
  )
}

export const OverviewHeader = ({
  earnBalance,
  walletBalance
}: {
  earnBalance: UseEarnBalancesReturn
  walletBalance: string
}) => {
  if (earnBalance.vaults.loading) return null

  const netWorth = bn(earnBalance.totalEarningBalance).plus(bn(walletBalance)).toString()

  return (
    <Card variant='unstyled' textAlign='center'>
      <Card.Header px={0} textAlign='left'>
        <StatGroup>
          <Stat>
            <StatLabel>
              <Text translation='defi.netWorth' />
            </StatLabel>
            <StatNumber fontSize={48}>
              <Amount.Fiat value={netWorth} />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Header>
      <Card.Footer px={0}>
        <SimpleGrid gridTemplateColumns='repeat(auto-fit,minmax(200px,1fr))' gridGap={6}>
          <EarnStat label='defi.walletBalance' value={walletBalance} />
          <EarnStat label='defi.earnBalance' value={earnBalance.totalEarningBalance} />
        </SimpleGrid>
      </Card.Footer>
    </Card>
  )
}
