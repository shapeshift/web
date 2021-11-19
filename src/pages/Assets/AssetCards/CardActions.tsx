import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { Trade } from 'components/Trade/Trade'

export const CardActions = () => {
  return (
    <Card flex={1} variant='outline'>
      <Card.Header textAlign='center'>
        <Card.Heading>
          <Text translation='assets.assetCards.assetActions.trade' />
        </Card.Heading>
      </Card.Header>
      <Card.Body>
        <Trade />
      </Card.Body>
    </Card>
  )
}
