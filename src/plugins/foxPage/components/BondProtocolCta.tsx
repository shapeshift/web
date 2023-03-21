import { Button, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

export const BondProtocolCta = () => {
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    getMixPanel()?.track(MixPanelEvents.Click, { element: 'BondProtocol Button' })
  }, [])
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='plugins.foxPage.bondProtocol.title' />
        </Card.Heading>
      </Card.Header>
      <Card.Body display='flex' gap={6} flexDirection='column'>
        <Text color='gray.500' translation='plugins.foxPage.bondProtocol.body' />
        <Button
          as={Link}
          href='https://app.bondprotocol.finance/#/market/1/70'
          isExternal
          colorScheme='blue'
          onClick={handleClick}
        >
          {translate('plugins.foxPage.bondProtocol.cta')}
        </Button>
      </Card.Body>
    </Card>
  )
}
