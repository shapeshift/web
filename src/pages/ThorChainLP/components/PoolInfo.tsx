import type { FlexProps } from '@chakra-ui/react'
import { Card, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { AssetSymbol } from 'components/AssetSymbol'
import { ChangeTag } from 'components/ChangeTag/ChangeTag'
import { Text } from 'components/Text'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type PoolInfoProps = {
  assetIds: AssetId[]
  allTimeVolume?: string
  volume24h?: string
  volume24hChange?: number
  fees24h?: string
  fee24hChange?: number
  apy?: string
  tvl?: string
  tvl24hChange?: number
  direction?: FlexProps['flexDirection']
  display?: 'full' | 'teaser'
  reverse?: boolean
  runeTvlCryptoPrecision?: string
  assetTvlCryptoPrecision?: string
}

export const PoolInfo = ({
  assetIds,
  allTimeVolume,
  volume24h,
  volume24hChange,
  fees24h,
  fee24hChange,
  apy,
  tvl,
  tvl24hChange,
  direction = 'row',
  display = 'teaser',
  reverse = false,
  runeTvlCryptoPrecision,
  assetTvlCryptoPrecision,
}: PoolInfoProps) => {
  const asset0 = useAppSelector(state => selectAssetById(state, assetIds[0]))
  const asset1 = useAppSelector(state => selectAssetById(state, assetIds[1]))
  const asset0MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetIds[0]),
  )
  const asset1MarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetIds[1]),
  )

  const volumeChangeTag: JSX.Element = useMemo(() => {
    return <ChangeTag size='md' percentChangeDecimal={volume24hChange} />
  }, [volume24hChange])

  const feeChangeTag: JSX.Element = useMemo(() => {
    return <ChangeTag size='md' percentChangeDecimal={fee24hChange} />
  }, [fee24hChange])

  const tvlChangeTag: JSX.Element | null = useMemo(() => {
    return <ChangeTag size='md' percentChangeDecimal={tvl24hChange} />
  }, [tvl24hChange])

  if (!(asset0 && asset1 && asset0MarketData && asset1MarketData)) {
    return null
  }

  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />
        <Skeleton isLoaded={apy !== undefined}>
          <Tag colorScheme='green'>
            <Amount.Percent value={apy ?? 0} suffix='APY' />
          </Tag>
        </Skeleton>
      </Flex>
      {display === 'full' && (
        <Stack spacing={2} flex={1} flexDir={reverse ? 'column-reverse' : 'column'}>
          <Card borderRadius='lg'>
            <Stack px={4} py={2} spacing={4}>
              <Flex justifyContent='space-between' fontSize='sm' fontWeight='medium'>
                <Flex gap={2}>
                  <AssetIcon size='xs' assetId={assetIds[1]} />
                  <AssetSymbol assetId={assetIds[1]} />
                </Flex>
                <Amount value={runeTvlCryptoPrecision ?? ''} abbreviated={true} />
              </Flex>
              <Flex justifyContent='space-between' fontSize='sm' fontWeight='medium'>
                <Flex gap={2}>
                  <AssetIcon size='xs' assetId={assetIds[0]} />
                  <AssetSymbol assetId={assetIds[0]} />
                </Flex>
                <Amount value={assetTvlCryptoPrecision ?? ''} abbreviated={true} />
              </Flex>
            </Stack>
          </Card>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalTokensLocked'
          />
        </Stack>
      )}

      {display === 'teaser' && (
        <Flex flexWrap='wrap' gap={6} mx={-2} flexDirection={direction}>
          <Card borderRadius='full'>
            <Flex gap={2} pl={2} pr={3} py={2} alignItems='center'>
              <AssetIcon size='xs' assetId={assetIds[0]} />
              <Amount.Fiat
                value={asset0MarketData.price}
                prefix={`1 ${asset0.symbol} =`}
                fontSize='xs'
                fontWeight='medium'
              />
            </Flex>
          </Card>
          <Card borderRadius='full'>
            <Flex gap={2} pl={2} pr={3} py={2} alignItems='center'>
              <AssetIcon size='xs' assetId={assetIds[1]} />
              <Amount.Fiat
                value={asset1MarketData.price}
                prefix={`1 ${asset1.symbol} =`}
                fontSize='xs'
                fontWeight='medium'
              />
            </Flex>
          </Card>
        </Flex>
      )}

      <Flex flexWrap='wrap' gap={6} flexDirection={direction}>
        <Stack spacing={0} flex={1} flexDir={reverse ? 'column-reverse' : 'column'}>
          <Skeleton isLoaded={tvl !== undefined}>
            <Flex alignItems='center' gap={2}>
              <Amount.Fiat fontSize='xl' value={tvl ?? 0} fontWeight='medium' />
              {tvlChangeTag}
            </Flex>
          </Skeleton>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalLiquidity'
          />
        </Stack>
        <Stack spacing={0} flex={1} flexDir={reverse ? 'column-reverse' : 'column'}>
          <Skeleton isLoaded={allTimeVolume !== undefined}>
            <Flex alignItems='center' gap={2}>
              <Amount.Fiat fontSize='xl' value={allTimeVolume ?? '0'} fontWeight='medium' />
            </Flex>
          </Skeleton>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalVolume'
          />
        </Stack>
      </Flex>
      <Flex flexWrap='wrap' gap={6} flexDirection={direction}>
        <Stack spacing={0} flex={1} flexDir={reverse ? 'column-reverse' : 'column'}>
          <Skeleton isLoaded={volume24h !== undefined}>
            <Flex alignItems='center' gap={2}>
              <Amount.Fiat fontSize='xl' value={volume24h ?? 0} fontWeight='medium' />
              {volumeChangeTag}
            </Flex>
          </Skeleton>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.volume24h'
          />
        </Stack>
        <Stack spacing={0} flex={1} flexDir={reverse ? 'column-reverse' : 'column'}>
          <Skeleton isLoaded={fees24h !== undefined}>
            <Flex alignItems='center' gap={2}>
              <Amount.Fiat fontSize='xl' value={fees24h ?? 0} fontWeight='medium' />
              {feeChangeTag}
            </Flex>
          </Skeleton>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation='pools.fees24h' />
        </Stack>
      </Flex>
    </>
  )
}
