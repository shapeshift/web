import { SimpleGrid, Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

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
  portfolioBalance,
}: {
  earnBalance: string
  portfolioBalance: string
}) => {
  const netWorth = bnOrZero(portfolioBalance).plus(earnBalance)
  return (
    <Card variant='unstyled' textAlign='center'>
      <Card.Header px={{ base: 4, xl: 0 }} textAlign='left'>
        <StatGroup>
          <Stat>
            <StatLabel>
              <Text translation='defi.netWorth' />
            </StatLabel>
            <StatNumber fontSize={48}>
              <Amount.Fiat value={netWorth.toFixed()} />
            </StatNumber>
          </Stat>
        </StatGroup>
      </Card.Header>
      <Card.Footer px={0}>
        <SimpleGrid
          gridTemplateColumns='repeat(auto-fit,minmax(200px,1fr))'
          gridGap={{ base: 0, lg: 6 }}
        >
          <EarnStat label='defi.walletBalance' value={portfolioBalance} />
          <EarnStat label='defi.earnBalance' value={earnBalance} />
        </SimpleGrid>
      </Card.Footer>
    </Card>
  )
}
