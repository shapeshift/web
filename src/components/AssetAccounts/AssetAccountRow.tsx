import type { SimpleGridProps } from '@chakra-ui/react'
import {
  Box,
  Flex,
  SimpleGrid,
  Stack,
  Tag,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { fromAssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import { generatePath, Link } from 'react-router-dom'
import { Allocations } from 'components/AccountRow/Allocations'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectCryptoHumanBalanceIncludingStakingByFilter,
  selectFiatBalanceIncludingStakingByFilter,
  selectPortfolioAllocationPercentByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

// This can maybe be combined with the other AccountRow component once we know how the data works
// src/components/AccountRow
// Link url should be the account page /Accounts/[account] or whatever the route is

type AssetAccountRowProps = {
  accountId: AccountSpecifier
  assetId?: AssetId
  showAllocation?: boolean
  isCompact?: boolean
} & SimpleGridProps

export const AssetAccountRow = ({
  accountId,
  assetId,
  showAllocation,
  isCompact,
  ...rest
}: AssetAccountRowProps) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)

  const filter = useMemo(() => ({ assetId: rowAssetId, accountId }), [rowAssetId, accountId])

  const fiatBalance = useAppSelector(s => selectFiatBalanceIncludingStakingByFilter(s, filter))
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceIncludingStakingByFilter(s, filter),
  )
  const allocation = useAppSelector(state =>
    selectPortfolioAllocationPercentByFilter(state, { accountId, assetId: rowAssetId }),
  )
  const path = generatePath(
    assetId ? '/accounts/:accountId/:assetId' : '/accounts/:accountId',
    filter,
  )
  const label = accountIdToLabel(accountId)

  if (!asset) return null
  return (
    <SimpleGrid
      as={Link}
      to={path}
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: 'minmax(0, 2fr) repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: showAllocation
          ? 'minmax(0, 2fr) 150px repeat(2, 1fr)'
          : `minmax(0, 2fr) repeat(${isCompact ? '1' : '2'}, 1fr)`,
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
          <AssetIcon assetId={asset.assetId} boxSize='30px' mr={2} />
        </Box>
        <Flex flexDir='column' ml={2} maxWidth='100%'>
          {assetNamespace !== 'slip44' && (
            <RawText fontWeight='bold' color='gray.500' fontSize='sm'>
              {feeAsset.name}
            </RawText>
          )}
          <Stack
            direction={{ base: 'column', md: 'row' }}
            alignContent='center'
            alignItems='flex-start'
            spacing={{ base: 2, md: 4 }}
          >
            <RawText
              fontWeight='medium'
              lineHeight='short'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              display='inline-block'
            >
              {asset?.name}
            </RawText>
            {assetReference && (
              <Tag
                whiteSpace='nowrap'
                colorScheme='blue'
                fontSize='x-small'
                fontWeight='bold'
                minHeight='auto'
                py={1}
              >
                {label}
              </Tag>
            )}
          </Stack>
        </Flex>
      </Flex>
      {showAllocation && (
        <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
          <Allocations value={allocation} />
        </Flex>
      )}
      {!isCompact && (
        <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
          <Amount.Crypto value={cryptoHumanBalance} symbol={asset?.symbol} />
        </Flex>
      )}

      <Flex justifyContent='flex-end'>
        <Flex flexDir='column' textAlign='right'>
          <Amount.Fiat value={fiatBalance} />
          {(isCompact || !isLargerThanMd) && (
            <Amount.Crypto color='gray.500' value={cryptoHumanBalance} symbol={asset?.symbol} />
          )}
        </Flex>
      </Flex>
    </SimpleGrid>
  )
}
