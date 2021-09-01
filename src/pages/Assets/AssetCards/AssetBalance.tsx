import { Stat, StatGroup, StatLabel, StatNumber } from '@chakra-ui/react'
import { Card } from 'components/Card'
import { Text } from 'components/Text'

export const AssetBalance = () => {
  return (
    <Card variant='unstyled' size='sm'>
      <Card.Header>
        <Card.Heading color='gray.400'>
          <Text translation={'assets.assetCards.accounts'} />
        </Card.Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <StatGroup>
          <Stat>
            <StatLabel color='gray.500' isTruncated>
              Balance
            </StatLabel>
            <StatNumber>0.00 BTC</StatNumber>
          </Stat>
          <Stat textAlign='right'>
            <StatLabel>Value</StatLabel>
            <StatNumber>$0,000.00</StatNumber>
          </Stat>
        </StatGroup>
      </Card.Body>
    </Card>
  )
}
