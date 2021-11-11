import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { UseEarnBalancesReturn } from '../views/Overview'

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

export const OverviewHeader = ({ balances }: { balances: UseEarnBalancesReturn }) => {
  if (balances.vaults.loading) return null
  return (
    <Card variant='unstyled'>
      <Card.Header px={0}>
        <StatGroup>
          <Stat>
            <StatLabel>
              <Text translation='earn.totalEarningBalance' />
            </StatLabel>
            <StatNumber fontSize={48}>
              <Amount.Fiat value={balances.totalEarningBalance} />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Header>
      <Card.Body px={0}>
        <StatGroup>
          <EarnStat label='earn.stakingBalance' value={balances.vaults.totalBalance} />
        </StatGroup>
      </Card.Body>
    </Card>
  )
}
