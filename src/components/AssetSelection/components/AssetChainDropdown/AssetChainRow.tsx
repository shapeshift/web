import { Flex } from '@chakra-ui/react'
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
  assetId: AssetId
  hideBalances?: boolean
}
export const AssetChainRow: React.FC<AssetChainRowProps> = ({ assetId, hideBalances }) => {
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

  if (!feeAsset) return null

  return (
    <Flex alignItems='center' justifyContent='space-between' width='100%' height={12}>
      <Flex alignItems='center' gap={4}>
        <LazyLoadAvatar src={iconSrc} size='xs' />
        {feeAsset.networkName ?? feeAsset.name}
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
