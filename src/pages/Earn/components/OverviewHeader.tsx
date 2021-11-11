import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

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

export const OverviewHeader = () => {
  return (
    <Card variant='unstyled'>
      <Card.Header px={0}>
        <StatGroup>
          <Stat>
            <StatLabel>
              <Text translation='earn.totalEarningBalance' />
            </StatLabel>
            <StatNumber fontSize={48}>
              <Amount.Fiat value='13975.25' />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Header>
      <Card.Body px={0}>
        <StatGroup>
          <EarnStat label='earn.stakingBalance' value='13532.97' />
        </StatGroup>
      </Card.Body>
    </Card>
  )
}
