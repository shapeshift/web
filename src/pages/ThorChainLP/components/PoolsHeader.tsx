import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Container, Heading, Stack } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader, PageHeaderButton } from 'components/Layout/Header/PageHeader'
import type { TabItem } from 'components/TabMenu/TabMenu'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'

const containerPadding = { base: 4, '2xl': 8 }
const flexDirection: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const alignItems = { base: 'flex-start', md: 'center' }

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

  const handleBack = useCallback(() => {
    history.push('/explore')
  }, [history])

  return (
    <>
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('pools.pools')}</PageHeader.Title>
          </PageHeader.Middle>
          <PageHeader.Right>
            <PageHeaderButton
              icon={plusIcon}
              aria-label='Add Liquidity'
              onClick={handleAddLiquidityClick}
            />
          </PageHeader.Right>
        </PageHeader>
      </Display.Mobile>
      <Stack mb={4}>
        <Display.Desktop>
          <Container
            display='flex'
            justifyContent='space-between'
            alignItems={alignItems}
            maxWidth='container.4xl'
            gap={2}
            px={containerPadding}
            flexDir={flexDirection}
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
        </Display.Desktop>
        <TabMenu items={NavItems} />
      </Stack>
    </>
  )
}
