import { Box, Flex, SimpleGrid, SimpleGridProps, useColorModeValue } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { generatePath, Link } from 'react-router-dom'
import { Allocations } from 'components/AccountRow/Allocations'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  AccountSpecifier,
  selectPortfolioFiatBalancesByFilter
} from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

// This can maybe be combined with the other AccountRow component once we know how the data works
// src/components/AccountRow
// Link url should be the account page /Accounts/[account] or whatever the route is

type AssetAccountRowProps = {
  accountId: AccountSpecifier
  assetId: CAIP19
  showAllocation?: boolean
} & SimpleGridProps

export const AssetAccountRow = ({
  accountId,
  assetId,
  showAllocation,
  ...rest
}: AssetAccountRowProps) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  const fiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalancesByFilter(state, { accountId, assetId })
  )
  const path = generatePath('/accounts/:accountId/:assetId', {
    accountId,
    assetId
  })

  if (!asset) return null
  return (
    <SimpleGrid
      as={Link}
      to={path}
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: 'minmax(0, 2fr) repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: showAllocation ? 'minmax(0, 2fr) 150px repeat(2, 1fr)' : 'minmax(0, 2fr) repeat(2, 1fr)'
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
        <Box position='relative'>
          {asset?.tokenId && (
            <AssetIcon
              src={feeAsset.icon}
              right={0}
              top={-1}
              boxSize='20px'
              position='absolute'
              zIndex={2}
              boxShadow='lg'
            />
          )}
          <AssetIcon src={asset?.icon} boxSize='30px' mr={2} />
        </Box>
        <Flex flexDir='column' ml={2} maxWidth='100%'>
          {asset?.tokenId && (
            <RawText fontWeight='bold' color='gray.500' fontSize='sm'>
              {feeAsset.name}
            </RawText>
          )}
          <RawText
            fontWeight='medium'
            lineHeight='short'
            mb={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            overflow='hidden'
            display='inline-block'
          >
            {asset?.name}
          </RawText>
        </Flex>
      </Flex>
      {showAllocation && (
        <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
          <Allocations value={10} color={'#000'} />
        </Flex>
      )}
      <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
        <Amount.Crypto value={'100'} symbol={asset?.symbol} />
      </Flex>
      <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
        <Flex flexDir='column' textAlign='right'>
          <Amount.Fiat value={fiatBalance} />
          <Amount.Crypto
            display={{ base: 'block', md: 'none' }}
            color='gray.500'
            value={'100'}
            symbol={asset?.symbol}
          />
        </Flex>
      </Flex>
    </SimpleGrid>
  )
}
