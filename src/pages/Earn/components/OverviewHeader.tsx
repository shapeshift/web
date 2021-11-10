import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

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
          <Stat>
            <StatLabel>
              <Text translation='earn.stakingBalance' />
            </StatLabel>
            <StatNumber>
              <Amount.Fiat value='13532.97' />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>
              <Text translation='earn.farmingBalance' />
            </StatLabel>
            <StatNumber>
              <Amount.Fiat value='13532.97' />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel>
              <Text translation='earn.liquidityPoolBalance' />
            </StatLabel>
            <StatNumber>
              <Amount.Fiat value='13532.97' />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Body>
    </Card>
  )
}
