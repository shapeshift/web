import { Heading, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { SEO } from 'components/Layout/Seo'
import { Text } from 'components/Text'

export const RFOXHeader = () => {
  const translate = useTranslate()
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])

  return (
    <PageHeader>
      <SEO title={translate('RFOX.staking')} />
      <Display.Mobile>
        <PageHeader.Left>
          <PageBackButton onBack={handleBack} />
        </PageHeader.Left>
      </Display.Mobile>
      <Display.Desktop>
        <PageHeader.Left>
          <Stack pb={4}>
            <Heading>{translate('RFOX.staking')}</Heading>
            <Text translation='explore.rfox.body' color='text.subtle' />
          </Stack>
        </PageHeader.Left>
      </Display.Desktop>
      <Display.Mobile>
        <PageHeader.Middle>
          <PageHeader.Title>{translate('RFOX.staking')}</PageHeader.Title>
        </PageHeader.Middle>
      </Display.Mobile>
    </PageHeader>
  )
}
