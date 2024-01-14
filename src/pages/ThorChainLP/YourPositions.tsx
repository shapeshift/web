import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useIsFetching } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import { usePools } from './hooks/usePools'
import { useUserLpData } from './hooks/useUserLpData'

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

type PositionButtonProps = {
  assetId: AssetId
  name: string
  opportunityId: string
  apy: string
}

const PositionButton = ({ apy, assetId, name, opportunityId }: PositionButtonProps) => {
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const { data, isLoading } = useUserLpData({ assetId })

  const foundPool = (data ?? []).find(pool => pool.opportunityId === opportunityId)

  const handlePoolClick = useCallback(() => {
    if (!foundPool) return

    const { opportunityId, accountId } = foundPool
    history.push(
      generatePath('/pools/poolAccount/:accountId/:opportunityId', { accountId, opportunityId }),
    )
  }, [foundPool, history])

  const poolAssetIds = useMemo(() => {
    if (!foundPool) return []

    return [assetId, thorchainAssetId]
  }, [assetId, foundPool])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const totalRedeemableValue = useMemo(() => {
    if (!foundPool) return '0'
    const { asset, rune } = foundPool.redeemableFees

    const assetValueFiatUserCurrency = bn(asset).times(assetMarketData.price)
    const runeValueFiatUserCurrency = bn(rune).times(runeMarketData.price)
    return assetValueFiatUserCurrency.plus(runeValueFiatUserCurrency).toFixed()
  }, [foundPool, assetMarketData, runeMarketData])

  if (!foundPool || !asset || !runeAsset) return null

  return (
    <Stack mx={listMargin}>
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
          <RawText>{name}</RawText>
          <Tag size='sm'>
            <Amount.Percent value={apy} />
          </Tag>
        </Flex>
        <Stack spacing={0} alignItems={alignItems}>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat value={foundPool.totalValueFiatUserCurrency} />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={foundPool.underlyingAssetAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
            <Amount.Crypto
              value={foundPool.underlyingRuneAmountCryptoPrecision}
              symbol={runeAsset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
        </Stack>
        <Stack display={mobileDisplay} spacing={0}>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat value={totalRedeemableValue} />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={foundPool.redeemableFees.asset}
              symbol={asset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={foundPool.redeemableFees.rune}
              symbol={'RUNE'}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
        </Stack>
        <Skeleton isLoaded={!isLoading} display={largeDisplay}>
          <Amount.Percent
            options={{ maximumFractionDigits: 8 }}
            value={bn(foundPool.poolOwnershipPercentage).div(100).toFixed()}
          />
        </Skeleton>
      </Button>
    </Stack>
  )
}

export const YourPositions = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  const emptyIcon = useMemo(() => <PoolsIcon />, [])

  const { data: parsedPools } = usePools()

  const isEmpty = false
  const isLoading = useIsFetching({ queryKey: ['thorchainUserLpData'] })

  const positionRows = useMemo(() => {
    if (isLoading) return new Array(2).fill(null).map(() => <Skeleton height={16} />)
    const rows = parsedPools?.map(pool => {
      return (
        <PositionButton
          assetId={pool.assetId}
          name={pool.name}
          opportunityId={pool.opportunityId}
          apy={pool.poolAPY}
          key={pool.opportunityId}
        />
      )
    })

    if (isEmpty) {
      return (
        <ResultsEmpty
          title='pools.yourPositions.emptyTitle'
          body='pools.yourPositions.emptyBody'
          icon={emptyIcon}
        />
      )
    }

    return rows
  }, [emptyIcon, isEmpty, isLoading, parsedPools])

  const renderHeader = useMemo(() => {
    if (!isEmpty) {
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
  }, [isEmpty])

  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        {renderHeader}
        {positionRows}
      </Stack>
    </Main>
  )
}
