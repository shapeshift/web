import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { RawText, Text } from 'components/Text'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '1fr repeat(2, minmax(200px, max-content))',
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

const alignItems = {
  base: 'flex-end',
  lg: 'flex-start',
}

const PositionButton = () => {
  const history = useHistory()
  const isLoaded = true

  const handlePoolClick = useCallback(() => {
    history.push('/pools/pool/1')
  }, [history])

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
        <RawText>USDC LP</RawText>
        <Tag size='sm'>
          <Amount.Percent value='0.1' />
        </Tag>
      </Flex>
      <Stack spacing={0} alignItems={alignItems}>
        <Skeleton isLoaded={isLoaded}>
          <Amount.Fiat value='1000000' />
        </Skeleton>
        <Skeleton isLoaded={isLoaded}>
          <Amount.Crypto value='100' symbol='USDC' fontSize='sm' color='text.subtle' />
        </Skeleton>
      </Stack>
      <Stack display={mobileDisplay} spacing={0}>
        <Skeleton isLoaded={isLoaded}>
          <Amount.Fiat value='1000000' />
        </Skeleton>
        <Skeleton isLoaded={isLoaded}>
          <Amount.Crypto value='100' symbol='USDC' fontSize='sm' color='text.subtle' />
        </Skeleton>
      </Stack>
      <Skeleton isLoaded={isLoaded} display={largeDisplay}>
        <Amount.Percent value='0.02' />
      </Skeleton>
    </Button>
  )
}

export const YourPositions = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  const emptyIcon = useMemo(() => <PoolsIcon />, [])
  const isActive = true

  const positionRows = useMemo(() => {
    if (isActive) {
      return (
        <Stack mx={listMargin}>
          <PositionButton />
        </Stack>
      )
    }
    return (
      <ResultsEmpty
        title='pools.yourPositions.emptyTitle'
        body='pools.yourPositions.emptyBody'
        icon={emptyIcon}
      />
    )
  }, [emptyIcon, isActive])

  const renderHeader = useMemo(() => {
    if (isActive) {
      return (
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='pools.pool' />

          <Text translation='pools.balance' />
          <Flex display={mobileDisplay}>
            <Text translation='pools.unclaimedFees' />
          </Flex>
          <Flex display={largeDisplay}>
            <Text translation='pools.poolShare' />
          </Flex>
        </SimpleGrid>
      )
    }
  }, [isActive])

  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        {renderHeader}
        {positionRows}
      </Stack>
    </Main>
  )
}
