import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import type { MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import memoize from 'lodash/memoize'
import { useMemo } from 'react'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { toBaseUnit } from 'lib/math'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { BASE_BPS_POINTS } from 'lib/utils/thorchain/constants'
import { getMaybeThorchainLendingCloseQuote } from 'lib/utils/thorchain/lending'
import type { LendingWithdrawQuoteResponseSuccess } from 'lib/utils/thorchain/lending/types'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectMarketDataById,
  selectUserCurrencyToUsdRate,
} from 'state/slices/marketDataSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useLendingPositionData } from './useLendingPositionData'

type UseLendingQuoteCloseQueryProps = {
  repaymentAssetId: AssetId
  repaymentAccountId: AccountId
  collateralAccountId: AccountId
  collateralAssetId: AssetId
  repaymentPercent: number
  isLoanClosePending?: boolean
}

const selectLendingCloseQueryData = memoize(
  ({
    data,
    collateralAssetMarketData,
    repaymentAssetMarketData,
    repaymentAmountCryptoPrecision,
  }: {
    data: LendingWithdrawQuoteResponseSuccess
    collateralAssetMarketData: MarketData
    repaymentAssetMarketData: MarketData
    repaymentAmountCryptoPrecision: string | null
  }) => {
    const quote = data

    const quoteLoanCollateralDecreaseCryptoPrecision = fromThorBaseUnit(
      quote.expected_collateral_withdrawn,
    ).toString()
    const quoteLoanCollateralDecreaseFiatUserCurrency = fromThorBaseUnit(
      quote.expected_collateral_withdrawn,
    )
      .times(repaymentAssetMarketData.price)
      .toString()
    const quoteDebtRepaidAmountUsd = fromThorBaseUnit(quote.expected_debt_repaid).toString()
    const quoteWithdrawnAmountAfterFeesCryptoPrecision = fromThorBaseUnit(
      quote.expected_amount_out,
    ).toString()
    const quoteWithdrawnAmountAfterFeesUserCurrency = bnOrZero(
      quoteWithdrawnAmountAfterFeesCryptoPrecision,
    )
      .times(collateralAssetMarketData?.price ?? 0)
      .toString()

    const quoteSlippagePercentageDecimal = bnOrZero(quote.fees.slippage_bps)
      .div(BASE_BPS_POINTS)
      .toString()
    const quoteTotalFeesFiatUserCurrency = fromThorBaseUnit(quote.fees.total)
      .times(collateralAssetMarketData?.price ?? 0)
      .toString()
    const withdrawnAmountBeforeFeesCryptoPrecision = fromThorBaseUnit(
      bnOrZero(quote.expected_amount_out).plus(quote.fees.total),
    )
    const quoteSlippageWithdrawndAssetCryptoPrecision = withdrawnAmountBeforeFeesCryptoPrecision
      .times(quoteSlippagePercentageDecimal)
      .toString()

    const quoteInboundAddress = quote.inbound_address
    const quoteMemo = quote.memo

    return {
      quoteLoanCollateralDecreaseCryptoPrecision,
      quoteLoanCollateralDecreaseFiatUserCurrency,
      quoteDebtRepaidAmountUsd,
      quoteWithdrawnAmountAfterFeesCryptoPrecision,
      quoteWithdrawnAmountAfterFeesUserCurrency,
      quoteSlippageWithdrawndAssetCryptoPrecision,
      quoteTotalFeesFiatUserCurrency,
      quoteInboundAddress,
      quoteMemo,
      repaymentAmountCryptoPrecision,
    }
  },
)

export const useLendingQuoteCloseQuery = ({
  repaymentAssetId: _repaymentAssetId,
  collateralAssetId: _collateralAssetId,
  repaymentPercent: _repaymentPercent,
  repaymentAccountId: _repaymentAccountId,
  collateralAccountId: _collateralAccountId,
  isLoanClosePending: _isLoanClosePending,
}: UseLendingQuoteCloseQueryProps) => {
  const repaymentPercentOrDefault = useMemo(() => {
    const repaymentPercentBn = bnOrZero(_repaymentPercent)
    // 1% buffer in case our market data differs from THOR's, to ensure 100% loan repays are actually 100% repays
    if (!repaymentPercentBn.eq(100)) return _repaymentPercent
    return repaymentPercentBn.plus('1').toNumber()
  }, [_repaymentPercent])

  const { data: lendingPositionData } = useLendingPositionData({
    assetId: _collateralAssetId,
    accountId: _collateralAccountId,
  })

  const lendingQuoteCloseQueryKey = useDebounce(
    () => [
      'lendingQuoteCloseQuery',
      {
        collateralAssetAddress: lendingPositionData?.address ?? '',
        repaymentAssetId: _repaymentAssetId,
        repaymentAccountId: _repaymentAccountId,
        collateralAssetId: _collateralAssetId,
        collateralAccountId: _collateralAccountId,
        repaymentPercent: repaymentPercentOrDefault,
        isLoanClosePending: _isLoanClosePending,
      },
    ],
    500,
  ) as unknown as [string, UseLendingQuoteCloseQueryProps & { collateralAssetAddress: string }]

  const {
    repaymentAssetId,
    repaymentAccountId,
    collateralAssetId,
    collateralAccountId,
    repaymentPercent,
    isLoanClosePending,
  } = useMemo(
    () => ({
      repaymentAssetId: lendingQuoteCloseQueryKey[1].repaymentAssetId,
      repaymentAccountId: lendingQuoteCloseQueryKey[1].repaymentAccountId,
      collateralAssetId: lendingQuoteCloseQueryKey[1].collateralAssetId,
      collateralAccountId: lendingQuoteCloseQueryKey[1].collateralAccountId,
      repaymentPercent: lendingQuoteCloseQueryKey[1].repaymentPercent,
      isLoanClosePending: lendingQuoteCloseQueryKey[1].isLoanClosePending,
    }),
    [lendingQuoteCloseQueryKey],
  )

  const collateralAccountMetadataFilter = useMemo(
    () => ({ accountId: collateralAccountId }),
    [collateralAccountId],
  )
  const collateralAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, collateralAccountMetadataFilter),
  )
  const repaymentAsset = useAppSelector(state => selectAssetById(state, repaymentAssetId))
  const repaymentAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, repaymentAssetId),
  )

  const collateralAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, collateralAssetId),
  )

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const debtBalanceUserCurrency = useMemo(() => {
    return bnOrZero(lendingPositionData?.debtBalanceFiatUSD ?? 0)
      .times(userCurrencyToUsdRate)
      .toFixed()
  }, [lendingPositionData?.debtBalanceFiatUSD, userCurrencyToUsdRate])

  const repaymentAmountFiatUserCurrency = useMemo(() => {
    if (!lendingPositionData) return null

    const proratedCollateralFiatUserCurrency = bnOrZero(repaymentPercentOrDefault)
      .times(debtBalanceUserCurrency)
      .div(100)

    return proratedCollateralFiatUserCurrency.toFixed()
  }, [debtBalanceUserCurrency, lendingPositionData, repaymentPercentOrDefault])

  const repaymentAmountCryptoPrecision = useMemo(() => {
    if (!repaymentAmountFiatUserCurrency) return null

    return bnOrZero(repaymentAmountFiatUserCurrency).div(repaymentAssetMarketData.price).toFixed()
  }, [repaymentAmountFiatUserCurrency, repaymentAssetMarketData.price])

  const query = useQuery({
    staleTime: 5_000,
    queryKey: lendingQuoteCloseQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { collateralAssetAddress, repaymentAssetId, collateralAssetId }] = queryKey
      const quote = await getMaybeThorchainLendingCloseQuote({
        repaymentAssetId,
        collateralAssetId,
        repaymentAmountCryptoBaseUnit: toBaseUnit(
          repaymentAmountCryptoPrecision ?? 0, // actually always defined at runtime, see "enabled" option
          repaymentAsset?.precision ?? 0, // actually always defined at runtime, see "enabled" option
        ),
        collateralAssetAddress, // actually always defined at runtime, see "enabled" option
      })

      if (quote.isErr()) throw new Error(quote.unwrapErr())
      return quote.unwrap()
    },
    // This avoids retrying errored queries - i.e smaller amounts, or repayment locked will error
    // Failed queries go stale and don't honor "staleTime", which meaans failed queries would trigger a THOR daemon fetch from all consumers
    // vs. the failed query being considered fresh
    retry: false,
    select: data =>
      selectLendingCloseQueryData({
        data,
        collateralAssetMarketData,
        repaymentAssetMarketData,
        repaymentAmountCryptoPrecision,
      }),
    enabled: Boolean(
      !isLoanClosePending &&
        lendingPositionData?.address &&
        bnOrZero(repaymentPercentOrDefault).gt(0) &&
        repaymentAccountId &&
        collateralAssetId &&
        collateralAccountMetadata &&
        repaymentAsset &&
        repaymentAssetMarketData.price !== '0' &&
        bnOrZero(repaymentPercent).gt(0) &&
        repaymentAmountCryptoPrecision,
    ),
  })

  return query
}
