import { Button, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

export const DappBack = () => {
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    getMixPanel()?.track(MixPanelEvents.Click, { element: 'Dappback Button' })
  }, [])
  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='plugins.foxPage.dappBack.title' />
        </Card.Heading>
      </Card.Header>
      <Card.Body display='flex' gap={6} flexDirection='column'>
        <Text color='gray.500' translation='plugins.foxPage.dappBack.body' />
        <Button
          as={Link}
          href='https://dappback.com/shapeshift'
          isExternal
          colorScheme='blue'
          onClick={handleClick}
        >
          {translate('plugins.foxPage.dappBack.cta')}
        </Button>
      </Card.Body>
    </Card>
  )
}
