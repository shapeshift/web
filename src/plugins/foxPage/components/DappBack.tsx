import { Button, Card, CardBody, CardHeader, Heading, Link } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

export const DappBack = () => {
  const translate = useTranslate()
  const isFoxBondCTAEnabled = useFeatureFlag('FoxBondCTA')

  const handleClick = useCallback(() => {
    getMixPanel()?.track(MixPanelEvents.Click, { element: 'Dappback Button' })
  }, [])
  if (!isFoxBondCTAEnabled) return null
  return (
    <Card>
      <CardHeader>
        <Heading>
          <Text translation='plugins.foxPage.dappBack.title' />
        </Heading>
      </CardHeader>
      <CardBody display='flex' gap={6} flexDirection='column'>
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
      </CardBody>
    </Card>
  )
}
