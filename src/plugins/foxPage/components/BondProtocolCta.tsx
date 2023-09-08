import { Button, Card, CardBody, CardHeader, Heading, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
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
      <CardHeader>
        <Heading as='h5'>
          <Text translation='plugins.foxPage.bondProtocol.title' />
        </Heading>
      </CardHeader>
      <CardBody display='flex' gap={6} flexDirection='column'>
        <Text color='text.subtle' translation='plugins.foxPage.bondProtocol.body' />
        <Button
          as={Link}
          href='https://app.bondprotocol.finance/#/market/1/90'
          isExternal
          colorScheme='blue'
          onClick={handleClick}
        >
          {translate('plugins.foxPage.bondProtocol.cta')}
        </Button>
      </CardBody>
    </Card>
  )
}
