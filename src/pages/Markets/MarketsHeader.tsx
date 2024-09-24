import { Container, Heading, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import type { TabItem } from 'components/TabMenu/TabMenu'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'

const containerPadding = { base: 6, '2xl': 8 }
const containerPaddingTop = { base: 0, md: 8 }

export const MarketsHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'markets.recommended',
        path: '/markets/recommended',
        color: 'blue',
      },
      {
        label: 'markets.watchlist',
        path: '/markets/watchlist',
        color: 'blue',
      },
    ]
  }, [])

  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])

  const maybeCategory = useMemo(
    () =>
      history.location.pathname.match(/\/markets\/category\/(?<category>[\w]+)/)?.groups?.category,
    [history.location.pathname],
  )

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('navBar.markets')}</PageHeader.Title>
          </PageHeader.Middle>
        </PageHeader>
      </Display.Mobile>
      <Stack mb={4}>
        {!maybeCategory && (
          // Don't show tabs and heading when on a single category view
          <>
            <Container
              maxWidth='container.4xl'
              px={containerPadding}
              pt={containerPaddingTop}
              pb={4}
            >
              <Display.Desktop>
                <Stack>
                  <Heading>{translate('navBar.markets')}</Heading>
                  <Text color='text.subtle' translation='markets.marketsBody' />
                </Stack>
              </Display.Desktop>
            </Container>
            <TabMenu items={NavItems} />
          </>
        )}
      </Stack>
    </>
  )
}
