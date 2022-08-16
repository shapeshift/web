import {
  Box,
  Flex,
  SimpleGrid,
  SimpleGridProps,
  Stack,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import { AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId, accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectTotalCryptoBalanceWithDelegations,
  selectTotalFiatBalanceWithDelegations,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetAccountRowProps = {
  accountId: AccountSpecifier
  assetId?: AssetId
} & SimpleGridProps

export const AssetAccountRow = ({ accountId, assetId, ...rest }: AssetAccountRowProps) => {
  const rowHover = useColorModeValue('gray.100', 'gray.750')
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)

  const filter = useMemo(
    () => ({ assetId: rowAssetId, accountId, accountSpecifier }),
    [rowAssetId, accountId, accountSpecifier],
  )
  const fiatBalance = useAppSelector(state => selectTotalFiatBalanceWithDelegations(state, filter))
  const cryptoHumanBalance = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, filter),
  )

  const label = accountIdToLabel(accountId)

  if (!asset) return null
  return (
    <SimpleGrid
      as='button'
      _hover={{ bg: rowHover }}
      templateColumns={{
        base: 'minmax(0, 2fr) repeat(1, 1fr)',
        md: '1fr repeat(2, 1fr)',
        lg: 'minmax(0, 2fr) repeat(2, 1fr)',
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
          {/** don't show "exponentiated" asset icons for fee assets */}
          {assetNamespace !== 'slip44' && (
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
          {assetNamespace !== 'slip44' && (
            <RawText fontWeight='bold' color='gray.500' fontSize='sm'>
              {feeAsset.name}
            </RawText>
          )}
          <Stack direction='row' alignContent='center' alignItems='center' gridGap={1}>
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
      <Flex justifyContent='flex-end' textAlign='right' display={{ base: 'none', md: 'flex' }}>
        <Amount.Crypto value={cryptoHumanBalance} symbol={asset?.symbol} />
      </Flex>

      <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
        <Flex flexDir='column' textAlign='right'>
          <Amount.Fiat value={fiatBalance} />
        </Flex>
      </Flex>
    </SimpleGrid>
  )
}
