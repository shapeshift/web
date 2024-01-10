import { Container, Heading, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'
import type { TabItem } from 'pages/Dashboard/components/DashboardHeader'

const containerPadding = { base: 6, '2xl': 8 }

export const PoolsHeader = () => {
  const translate = useTranslate()
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'pools.availablePools',
        path: '/pools',
        color: 'blue',
        exact: true,
      },
      {
        label: 'pools.yourPositions',
        path: '/pools/positions',
        color: 'blue',
      },
    ]
  }, [])

  return (
    <Stack>
      <Container maxWidth='container.4xl' px={containerPadding} pt={8} pb={4}>
        <Stack>
          <Heading>{translate('lending.lending')}</Heading>
          <Text color='text.subtle' translation='lending.lendingBody' />
        </Stack>
      </Container>
      <TabMenu items={NavItems} />
    </Stack>
  )
}
