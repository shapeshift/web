import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Main } from 'components/Layout/Main'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { RawText, Text } from 'components/Text'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '200px repeat(2, 1fr)',
  xl: '1fr repeat(3, minmax(200px, max-content))',
}
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}

const largeDisplay = {
  base: 'none',
  xl: 'flex',
}

const mobilePadding = {
  base: 4,
  lg: 4,
  xl: 0,
}
const listMargin = {
  base: 0,
  lg: 0,
  xl: -4,
}

const PoolButton = () => {
  const isLoaded = true

  const handlePoolClick = useCallback(() => {
    console.info('pool click')
  }, [])

  const poolAssetIds = useMemo(() => [ethAssetId, usdcAssetId], [])

  return (
    <Button
      variant='ghost'
      display='grid'
      gridTemplateColumns={lendingRowGrid}
      columnGap={4}
      alignItems='center'
      textAlign='left'
      py={4}
      width='full'
      height='auto'
      color='text.base'
      onClick={handlePoolClick}
    >
      <Flex gap={4} alignItems='center'>
        <PoolIcon assetIds={poolAssetIds} size='sm' />
        <RawText>ETH/USDC</RawText>
        <Tag size='sm'>
          <Amount.Percent value='0.1' />
        </Tag>
      </Flex>
      <Skeleton isLoaded={isLoaded}>
        <Amount.Fiat value='1000000' />
      </Skeleton>
      <Skeleton isLoaded={isLoaded} display={mobileDisplay}>
        <Amount.Fiat value='1000000' />
      </Skeleton>
      <Skeleton isLoaded={isLoaded} display={largeDisplay}>
        <Amount.Fiat value='1000000' />
      </Skeleton>
    </Button>
  )
}

export const AvailablePools = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='pools.pool' />

          <Text translation='pools.tvl' />
          <Flex display={mobileDisplay}>
            <Text translation='pools.volume24h' />
          </Flex>
          <Flex display={largeDisplay}>
            <Text translation='pools.volume7d' />
          </Flex>
        </SimpleGrid>
        <Stack mx={listMargin}>
          <PoolButton />
        </Stack>
      </Stack>
    </Main>
  )
}
