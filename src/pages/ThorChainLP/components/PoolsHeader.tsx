import { Button, Container, Heading, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'
import type { TabItem } from 'pages/Dashboard/components/DashboardHeader'

const containerPadding = { base: 6, '2xl': 8 }

export const PoolsHeader = () => {
  const translate = useTranslate()
  const history = useHistory()
  const plusIcon = useMemo(() => <FaPlus />, [])
  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'pools.availablePools',
        path: '/pools',
        color: 'blue',
        exact: true,
      },
      {
        label: 'pools.yourPositions.yourPositions',
        path: '/pools/positions',
        color: 'blue',
      },
    ]
  }, [])

  const handleAddLiquidityClick = useCallback(() => {
    history.push('/pools/add')
  }, [history])

  return (
    <Stack>
      <Container
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        maxWidth='container.4xl'
        px={containerPadding}
        pt={8}
        pb={4}
      >
        <Stack>
          <Heading>{translate('pools.pools')}</Heading>
          <Text color='text.subtle' translation='pools.poolsBody' />
        </Stack>
        <Button colorScheme='blue' onClick={handleAddLiquidityClick} rightIcon={plusIcon}>
          {translate('pools.addLiquidity')}
        </Button>
      </Container>
      <TabMenu items={NavItems} />
    </Stack>
  )
}
