import { Button, Container, Heading, Stack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { TabMenu } from 'components/TabMenu/TabMenu'
import { Text } from 'components/Text'
import type { TabItem } from 'pages/Dashboard/components/DashboardHeader'

const containerPadding = { base: 4, '2xl': 8 }

const inputGroupProps = { maxWidth: '200px' }

type PoolsHeaderProps = {
  searchQuery?: string
  setSearchQuery: (filterValue: any) => void
  chainIds?: ChainId[]
  onChainIdChange: (arg: ChainId | undefined) => void
  filterByChainId?: ChainId
}

const buttonProps = { width: '80px', px: 2 }

export const PoolsHeader: React.FC<PoolsHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  chainIds,
  onChainIdChange,
  filterByChainId,
}) => {
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
        flexWrap='wrap'
        gap={4}
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

      <TabMenu items={NavItems}>
        {chainIds && (
          <ChainDropdown
            chainIds={chainIds}
            onClick={onChainIdChange}
            chainId={filterByChainId}
            buttonProps={buttonProps}
            hideName
          />
        )}
        <GlobalFilter
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          inputGroupProps={inputGroupProps}
        />
      </TabMenu>
    </Stack>
  )
}
