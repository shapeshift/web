import type { FlexProps } from '@chakra-ui/react'
import { Flex, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { firstNonZeroDecimal } from '@/lib/math'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AssetChainRowProps = {
  mainImplementationAssetId: AssetId
  assetId: AssetId
  hideBalances?: boolean
  hideSymbol?: boolean
  flexProps?: FlexProps
  accountNumber?: number
}
export const AssetChainRow: React.FC<AssetChainRowProps> = ({
  mainImplementationAssetId,
  assetId,
  hideSymbol,
  hideBalances,
  flexProps,
  accountNumber,
}) => {
  const mainImplementationAsset = useAppSelector(state =>
    selectAssetById(state, mainImplementationAssetId),
  )
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const iconSrc = feeAsset?.networkIcon ?? feeAsset?.icon
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const accountId = useMemo(() => {
    if (accountNumber === undefined) return
    return accountIdsByAccountNumberAndChainId[accountNumber]?.[fromAssetId(assetId).chainId]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, assetId])

  // A scoped row whose account number has no account on this chain holds none of it, and an
  // accountId of undefined would otherwise read as every account
  const hasNoScopedAccount = accountNumber !== undefined && !accountId

  const filter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const cryptoPrecisionBalance = useAppSelector(s =>
    hasNoScopedAccount ? '0' : selectPortfolioCryptoBalanceByFilter(s, filter).toPrecision(),
  )

  const userCurrencyBalance = useAppSelector(state =>
    hasNoScopedAccount ? '0' : selectPortfolioUserCurrencyBalanceByFilter(state, filter),
  )

  // An account scoped row reports that account's balance as it is, zero included
  const hideAssetBalance =
    hideBalances || (accountNumber === undefined && bnOrZero(cryptoPrecisionBalance).isZero())

  if (!feeAsset || !asset || !mainImplementationAsset) return null

  return (
    <Flex alignItems='center' justifyContent='space-between' height={10} {...flexProps}>
      <Flex width={hideAssetBalance ? '100%' : 'inherit'} alignItems='center' gap={4}>
        <LazyLoadAvatar src={iconSrc} size='xs' />
        <Text as='span' textOverflow='ellipsis' overflow='hidden' lineHeight='normal'>
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
            value={firstNonZeroDecimal(bnOrZero(cryptoPrecisionBalance)) ?? '0'}
            symbol={asset?.symbol ?? ''}
          />
        </Flex>
      )}
    </Flex>
  )
}
