import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
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
    <Stat>
      <StatLabel>
        <Text translation={label} />
      </StatLabel>
      <StatNumber>
        <Amount.Fiat value={value} />
      </StatNumber>
    </Stat>
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
      <Card.Header px={0}>
        <StatGroup>
          <Stat>
            <StatLabel>
              <Text translation='earn.netWorth' />
            </StatLabel>
            <StatNumber fontSize={48}>
              <Amount.Fiat value={netWorth} />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Header>
      <Card.Body px={0}>
        <StatGroup borderWidth={1} borderColor='gray.700' borderRadius='lg' py={6}>
          <EarnStat label='earn.walletBalance' value={walletBalance} />
          <EarnStat label='earn.earnBalance' value={earnBalance.totalEarningBalance} />
        </StatGroup>
      </Card.Body>
    </Card>
  )
}
