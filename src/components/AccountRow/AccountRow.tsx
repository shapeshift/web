import { Flex, SimpleGrid, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import type { LinkProps } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Allocations } from './Allocations'

export type AccountRowArgs = {
  allocationValue: number
  assetId: AssetId
  to?: LinkProps['to']
}

export const AccountRow = ({ allocationValue, assetId, ...rest }: AccountRowArgs) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const url = useMemo(() => (assetId ? `/assets/${assetId}` : ''), [assetId])

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const cryptoValue = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId }),
  )
  const fiatValue = useAppSelector(state => selectPortfolioFiatBalanceByAssetId(state, { assetId }))

  if (!asset) return null // users may have assets we don't support

  return (
    <SimpleGrid
      as={Link}
      to={url}
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: '1fr repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: '2fr repeat(3, 1fr) 150px',
      }}
      py={4}
      pl={4}
      pr={4}
      rounded='lg'
      gridGap='1rem'
      alignItems='center'
      {...rest}
      data-test='account-row'
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
            data-test={`account-row-asset-name-${asset.symbol}`}
          >
            {asset.name}
          </RawText>
          <RawText color='gray.500' lineHeight='1'>
            {asset.symbol}
          </RawText>
        </Flex>
      </Flex>
      <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
        <Amount.Crypto
          value={cryptoValue}
          symbol={asset.symbol}
          data-test={`account-row-asset-crypto-${asset.symbol}`}
        />
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
        <Allocations value={allocationValue} />
      </Flex>
    </SimpleGrid>
  )
}
