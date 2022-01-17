import { Flex, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Link, LinkProps } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioFiatBalanceByAssetId
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

import { Allocations } from './Allocations'

export type AccountRowArgs = {
  allocationValue: number
  assetId: CAIP19
  to?: LinkProps['to']
}

export const AccountRow = ({ allocationValue, assetId, ...rest }: AccountRowArgs) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const url = useMemo(() => {
    if (!assetId) return ''
    const { chain, tokenId } = caip19.fromCAIP19(assetId)
    let baseUrl = `/assets/${chain}`
    if (tokenId) baseUrl = baseUrl + `/${tokenId}`
    return baseUrl
  }, [assetId])

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const cryptoValue = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, assetId)
  )
  const fiatValue = useAppSelector(state => selectPortfolioFiatBalanceByAssetId(state, assetId))

  if (!asset) return null // users may have assets we don't support

  return (
    <SimpleGrid
      as={Link}
      to={url}
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: '1fr repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: '2fr repeat(3, 1fr) 150px'
      }}
      py={4}
      pl={4}
      pr={4}
      rounded='lg'
      gridGap='1rem'
      alignItems='center'
      {...rest}
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
      <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
        <Amount.Crypto value={cryptoValue} symbol={asset.symbol} />
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} justifyContent='flex-end'>
        {!marketData?.price ? '--' : <Amount.Fiat value={marketData.price} />}
      </Flex>
      <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
        {!marketData?.price ? (
          '--'
        ) : (
          <Flex flexDir='column' textAlign='right'>
            <Amount.Fiat value={fiatValue} />
            <Amount.Crypto
              display={{ base: 'block', md: 'none' }}
              color='gray.500'
              value={cryptoValue}
              symbol={asset.symbol}
            />
          </Flex>
        )}
      </Flex>
      <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
        <Allocations value={allocationValue} color={asset.color} />
      </Flex>
    </SimpleGrid>
  )
}
