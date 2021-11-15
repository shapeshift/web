import { Flex, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RawText } from 'components/Text'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { fetchMarketData } from 'state/slices/marketDataSlice/marketDataSlice'

import { Allocations } from './Allocations'

export type AccountRowArgs = {
  allocationValue: number
  balance: string
  tokenId?: string
  chain: ChainTypes
}

export const AccountRow = ({ allocationValue, balance, tokenId, chain }: AccountRowArgs) => {
  const dispatch = useDispatch()
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const contract = useMemo(() => tokenId?.toLowerCase(), [tokenId])
  const url = useMemo(() => {
    let baseUrl = `/assets/${chain}`
    if (contract) baseUrl = baseUrl + `/${contract}`
    return baseUrl
  }, [chain, contract])

  const asset = useFetchAsset({ chain, tokenId: contract })
  const marketData = useSelector(
    (state: ReduxState) => state.marketData.marketData[asset?.tokenId ?? asset?.chain]
  )
  const marketDataLoading = useSelector((state: ReduxState) => state.marketData.loading)

  useEffect(() => {
    ;(async () => {
      if (asset && !marketData) {
        dispatch(
          fetchMarketData({
            chain: asset.chain,
            tokenId: asset.tokenId
          })
        )
      }
    })()
  }, [asset, dispatch, marketData])

  const displayValue = useMemo(
    () => (asset ? fromBaseUnit(balance, asset.precision) : 0),
    [asset, balance]
  )

  const fiatValue = useMemo(
    () =>
      bn(displayValue)
        .times(marketData?.price ?? 0)
        .toFixed(2)
        .toString(),
    [displayValue, marketData]
  )

  if (!asset) return null

  return (
    <SimpleGrid
      as={Link}
      to={url}
      _hover={{ bg: rowHover }}
      templateColumns={{ base: '1fr repeat(2, 1fr)', lg: '2fr repeat(3, 1fr) 150px' }}
      py={4}
      pl={4}
      pr={4}
      rounded='lg'
      gridGap='1rem'
      alignItems='center'
    >
      <Flex alignItems='center'>
        <AssetIcon src={asset.icon} boxSize='30px' mr={2} />
        <Flex flexDir='column' ml={2}>
          <RawText
            fontWeight='medium'
            lineHeight='1'
            mb={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            overflow='hidden'
            display='inline-block'
            width={{ base: '100px', xl: '100%' }}
          >
            {asset.name}
          </RawText>
          <RawText color='gray.500' lineHeight='1'>
            {asset.symbol}
          </RawText>
        </Flex>
      </Flex>
      <Flex justifyContent='flex-end' textAlign='right'>
        <Amount.Crypto value={displayValue.toString()} symbol={asset.symbol} />
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} justifyContent='flex-end'>
        {!marketData?.price ? (
          marketDataLoading ? (
            <CircularProgress isIndeterminate size='5' />
          ) : (
            '--'
          )
        ) : (
          <Amount.Fiat value={marketData.price} />
        )}
      </Flex>
      <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
        {!marketData?.price ? (
          marketDataLoading ? (
            <CircularProgress isIndeterminate size='5' />
          ) : (
            '--'
          )
        ) : (
          <Amount.Fiat value={fiatValue} />
        )}
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
        <Allocations value={allocationValue} color={asset.color} />
      </Flex>
    </SimpleGrid>
  )
}
