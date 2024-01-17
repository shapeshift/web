import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Card, Flex, Stack } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type PoolInfoProps = {
  assetIds: AssetId[]
  allTimeVolume: string
  volume24h: string
  volume24hChange: number
  fees24h: string
  fee24hChange: number
  apy: string
  tvl?: string
  tvl24hChange?: number
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
}: PoolInfoProps) => {
  const asset0 = useAppSelector(state => selectAssetById(state, assetIds[0]))
  const asset1 = useAppSelector(state => selectAssetById(state, assetIds[1]))
  const asset0MarketData = useAppSelector(state => selectMarketDataById(state, assetIds[0]))
  const asset1MarketData = useAppSelector(state => selectMarketDataById(state, assetIds[1]))

  const volumeChangeTag: JSX.Element = useMemo(() => {
    const icon = volume24hChange >= 0 ? ArrowUpIcon : ArrowDownIcon
    const colorScheme = volume24hChange >= 0 ? 'green' : 'red'
    return (
      <Tag colorScheme={colorScheme} size='sm' gap={0}>
        <TagLeftIcon as={icon} mr={1} />
        <Amount.Percent value={volume24hChange} autoColor fontWeight='medium' />
      </Tag>
    )
  }, [volume24hChange])

  const feeChangeTag: JSX.Element = useMemo(() => {
    const icon = fee24hChange >= 0 ? ArrowUpIcon : ArrowDownIcon
    const colorScheme = fee24hChange >= 0 ? 'green' : 'red'
    return (
      <Tag colorScheme={colorScheme} size='sm' gap={0}>
        <TagLeftIcon as={icon} mr={1} />
        <Amount.Percent value={fee24hChange} autoColor fontWeight='medium' />
      </Tag>
    )
  }, [fee24hChange])

  const tvlChangeTag: JSX.Element | null = useMemo(() => {
    if (tvl24hChange === undefined) return null
    const icon = tvl24hChange >= 0 ? ArrowUpIcon : ArrowDownIcon
    const colorScheme = tvl24hChange >= 0 ? 'green' : 'red'
    return (
      <Tag colorScheme={colorScheme} size='sm' gap={0}>
        <TagLeftIcon as={icon} mr={1} />
        <Amount.Percent value={tvl24hChange} autoColor fontWeight='medium' />
      </Tag>
    )
  }, [tvl24hChange])

  if (!(asset0 && asset1 && asset0MarketData && asset1MarketData)) {
    return null
  }

  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />
        <Tag colorScheme='green'>
          <Amount.Percent value={apy ?? 0} suffix='APY' />
        </Tag>
      </Flex>
      <Flex flexWrap='wrap' gap={4} mx={-2}>
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
      <Flex flexWrap='wrap' gap={12}>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={tvl ?? 0} fontWeight='medium' />
            {tvlChangeTag}
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalLiquidity'
          />
        </Stack>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={allTimeVolume ?? '0'} fontWeight='medium' />
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.totalVolume'
          />
        </Stack>
      </Flex>
      <Flex flexWrap='wrap' gap={12}>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={volume24h ?? 0} fontWeight='medium' />
            {volumeChangeTag}
          </Flex>
          <Text
            fontSize='sm'
            color='text.subtle'
            fontWeight='medium'
            translation='pools.volume24h'
          />
        </Stack>
        <Stack spacing={0} flex={1}>
          <Flex alignItems='center' gap={2}>
            <Amount.Fiat fontSize='xl' value={fees24h ?? 0} fontWeight='medium' />
            {feeChangeTag}
          </Flex>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation='pools.fees24h' />
        </Stack>
      </Flex>
    </>
  )
}
