import type { FlexProps } from '@chakra-ui/react'
import { Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetChainRowProps = {
  mainImplementationAssetId: AssetId
  assetId: AssetId
  hideBalances?: boolean
  hideSymbol?: boolean
  flexProps?: FlexProps
}
export const AssetChainRow: React.FC<AssetChainRowProps> = ({
  mainImplementationAssetId,
  assetId,
  hideSymbol,
  hideBalances,
  flexProps,
}) => {
  const mainImplementationAsset = useAppSelector(state =>
    selectAssetById(state, mainImplementationAssetId),
  )
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const iconSrc = feeAsset?.networkIcon ?? feeAsset?.icon
  const filter = useMemo(() => ({ assetId }), [assetId])
  const cryptoHumanBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )

  const userCurrencyBalance = useAppSelector(
    state => selectPortfolioUserCurrencyBalanceByAssetId(state, filter) ?? '0',
  )

  const hideAssetBalance = hideBalances || bnOrZero(cryptoHumanBalance).isZero()

  if (!feeAsset || !asset || !mainImplementationAsset) return null

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      maxWidth='210px'
      width='100%'
      height={10}
      {...flexProps}
    >
      <Flex width={hideAssetBalance ? '100%' : 'inherit'} alignItems='center' gap={4}>
        <LazyLoadAvatar src={iconSrc} size='xs' />
        <Text as='span' textOverflow='ellipsis' overflow='hidden'>
          {feeAsset.networkName ?? feeAsset.name}
        </Text>
        {!hideSymbol && mainImplementationAsset.symbol !== asset.symbol && ` (${asset.symbol})`}
      </Flex>
      {!hideAssetBalance && (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' paddingLeft={12}>
          <Amount.Fiat value={userCurrencyBalance} />
          <Amount.Crypto
            fontSize='sm'
            fontWeight='normal'
            color='text.subtle'
            value={firstNonZeroDecimal(bnOrZero(cryptoHumanBalance)) ?? '0'}
            symbol={asset?.symbol ?? ''}
          />
        </Flex>
      )}
    </Flex>
  )
}
